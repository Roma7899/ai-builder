import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import api from '../../../lib/api';
import type { SectionNode } from '../../../types/site.types';

const RENDERER_BASE =
  import.meta.env.VITE_RENDERER_URL || 'https://ai-builder-renderer.onrender.com';

interface Props {
  projectId: string;
}

export default function PreviewIframe({ projectId }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const siteJson = useEditorStore((s) => s.siteJson);
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectSection = useEditorStore((s) => s.selectSection);
  const authSentRef = useRef(false);

  const postToIframe = useCallback(
    (type: string, payload: unknown) => {
      if (!iframeRef.current?.contentWindow) return;
      try {
        iframeRef.current.contentWindow.postMessage({ type, payload }, RENDERER_BASE);
      } catch { /* cross-origin silent */ }
    },
    []
  );

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== new URL(RENDERER_BASE).origin) return;
      if (event.data?.type === 'RENDERER_READY' && !authSentRef.current) {
        authSentRef.current = true;
        try {
          const { data } = await api.post('/api/renderer/session');
          postToIframe('AUTH', { sessionToken: data.sessionToken });
        } catch {
          setError('Failed to authenticate preview session');
        }
        setReady(true);
      }
      if (event.data?.type === 'SECTION_CLICK') {
        const { sectionId } = event.data.payload ?? {};
        if (sectionId) selectSection(sectionId);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [postToIframe, selectSection]);

  useEffect(() => {
    if (ready && siteJson) {
      postToIframe('SITE_UPDATE', siteJson);
    }
  }, [ready, siteJson, postToIframe]);

  const widthMap: Record<string, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  };

  const handleLoad = () => {
    setError(null);
    setReady(false);
    authSentRef.current = false;
  };

  const handleError = () => {
    setError('Failed to load preview');
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 px-4 py-2 rounded">
          {error}
        </div>
      )}
      <div
        className="transition-all duration-300 ease-in-out bg-white rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: widthMap[previewMode],
          maxWidth: '100%',
          height: previewMode === 'mobile' ? '700px' : 'calc(100vh - 120px)',
        }}
      >
        <iframe
          ref={iframeRef}
          src={`${RENDERER_BASE}/?projectId=${projectId}`}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Website Preview"
        />
      </div>
    </div>
  );
}
