import { useEffect, useState, useCallback, useRef } from 'react';
import SiteRenderer from './SiteRenderer';
import { applyTheme } from './theme';
import type { SiteJSON, IFrameMessage, ParentMessage } from './types/site.types';
import { validateParentMessage } from './lib/validateMessage';

const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;

function isValidOrigin(origin: string): boolean {
  if (!EDITOR_ORIGIN) return true;
  return origin === EDITOR_ORIGIN || origin === window.location.origin;
}

export default function App() {
  const [siteJson, setSiteJson] = useState<SiteJSON | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const readySent = useRef(false);
  const fetchedRef = useRef(false);

  const postToParent = useCallback((msg: IFrameMessage) => {
    try {
      window.parent.postMessage(msg, EDITOR_ORIGIN || '*');
    } catch { /* cross-origin silent fail */ }
  }, []);

  useEffect(() => {
    if (!readySent.current) {
      postToParent({ type: 'RENDERER_READY' });
      readySent.current = true;
    }
  }, [postToParent]);

  useEffect(() => {
    const handler = (event: MessageEvent<ParentMessage>) => {
      if (!isValidOrigin(event.origin)) return;

      const validated = validateParentMessage(event.data);
      if (!validated) return;

      const { type, payload } = validated;

      switch (type) {
        case 'AUTH': {
          const { sessionToken } = payload as { sessionToken: string };
          if (sessionToken) {
            setAuthToken(sessionToken);
          }
          break;
        }
        case 'SITE_UPDATE': {
          const json = payload as SiteJSON;
          setSiteJson(json);
          applyTheme(json.theme);
          setError(null);
          break;
        }
        case 'SECTION_UPDATE': {
          const updated = payload as any;
          setSiteJson((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              sections: prev.sections.map((s) =>
                s.id === updated.id ? { ...s, props: updated.props } : s
              ),
            };
          });
          break;
        }
        case 'THEME_UPDATE': {
          applyTheme(payload as any);
          break;
        }
        case 'HIGHLIGHT_SECTION': {
          const { sectionId } = payload as { sectionId: string | null };
          setHighlightedSectionId(sectionId ?? undefined);
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('projectId');
    const apiUrl = import.meta.env.VITE_API_URL;

    if (projectId && apiUrl && authToken && !fetchedRef.current) {
      fetchedRef.current = true;
      fetch(`${apiUrl}/api/renderer/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load');
          return res.json();
        })
        .then((data) => {
          if (data.siteJson) {
            setSiteJson(data.siteJson);
            applyTheme(data.siteJson.theme);
          }
        })
        .catch((err) => setError(err.message));
    }
  }, [authToken]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!siteJson) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-400 text-sm">Loading preview...</p>
      </div>
    );
  }

  return (
    <SiteRenderer
      siteJson={siteJson}
      highlightedSectionId={highlightedSectionId}
      onSectionClick={(sectionId) =>
        postToParent({ type: 'SECTION_CLICK', payload: { sectionId } })
      }
    />
  );
}
