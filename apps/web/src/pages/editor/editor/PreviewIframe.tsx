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

      {previewMode === 'mobile' && (
        <div className="transition-all duration-300 ease-in-out">
          <div className="relative mx-auto bg-gray-900 rounded-[3rem] p-3 shadow-2xl" style={{ width: '420px' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-10" />
            <div className="bg-white rounded-[2.5rem] overflow-hidden" style={{ height: '700px' }}>
              <iframe
                ref={iframeRef}
                src={`${RENDERER_BASE}/?projectId=${projectId}`}
                onLoad={handleLoad}
                onError={handleError}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Website Preview"
                style={{ width: '390px', margin: '0 auto', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {previewMode === 'tablet' && (
        <div className="transition-all duration-300 ease-in-out">
          <div className="relative mx-auto bg-gray-900 rounded-[2rem] p-3 shadow-2xl" style={{ width: '808px' }}>
            <div className="bg-white rounded-[1.75rem] overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
              <iframe
                ref={iframeRef}
                src={`${RENDERER_BASE}/?projectId=${projectId}`}
                onLoad={handleLoad}
                onError={handleError}
                className="w-full h-full border-0"
                style={{ width: '768px', margin: '0 auto', display: 'block' }}
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Website Preview"
              />
            </div>
          </div>
        </div>
      )}

      {previewMode === 'desktop' && (
        <div
          className="transition-all duration-300 ease-in-out bg-white rounded-lg overflow-hidden shadow-2xl"
          style={{
            width: widthMap[previewMode],
            maxWidth: '100%',
            height: 'calc(100vh - 120px)',
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
      )}
    </div>
  );
}
