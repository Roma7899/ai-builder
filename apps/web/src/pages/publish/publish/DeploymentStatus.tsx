import { useEffect, useState, useRef } from 'react';

interface Props {
  projectId: string;
  deploymentId: string;
  onDone?: (cdnUrl: string) => void;
}

const STEPS = ['building', 'uploading', 'done'];
const STEP_LABELS: Record<string, string> = {
  building: 'Building site...',
  uploading: 'Uploading to CDN...',
  done: 'Live!',
  failed: 'Failed',
};

export default function DeploymentStatus({ projectId, deploymentId, onDone }: Props) {
  const [status, setStatus] = useState<string>('pending');
  const [message, setMessage] = useState('');
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_URL;
    const es = new EventSource(
      `${apiBaseUrl}/api/publish/projects/${deploymentId}/stream`,
      { withCredentials: true }
    );
    esRef.current = es;

    es.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data.status);
        setMessage(data.message ?? '');

        if (data.status === 'done') {
          if (data.cdnUrl) setCdnUrl(data.cdnUrl);
          if (onDone) onDone(data.cdnUrl ?? '');
          es.close();
        }

        if (data.status === 'failed') {
          es.close();
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [projectId, deploymentId, onDone]);

  const handleCopy = async () => {
    if (!cdnUrl) return;
    try {
      await navigator.clipboard.writeText(cdnUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const currentStepIndex = STEPS.indexOf(status);

  return (
    <div className="space-y-4">
      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isActive = i === currentStepIndex;
          const isCompleted = i < currentStepIndex;
          const isFailed = status === 'failed';

          return (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive && !isFailed
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : isFailed
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-600 text-gray-400'
                }`}
              >
                {isCompleted ? '\u2713' : isFailed ? '!' : i + 1}
              </div>
              <span className={`text-xs ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                {STEP_LABELS[step]}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    i < currentStepIndex ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {status !== 'done' && status !== 'failed' && (
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          {message || 'Processing...'}
        </div>
      )}

      {status === 'failed' && (
        <div className="text-sm text-red-400">
          {message || 'Deployment failed. Please try again.'}
        </div>
      )}

      {/* Success: show live URL */}
      {status === 'done' && cdnUrl && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
            <span className="text-lg">&#10003;</span> Site is live!
          </div>
          <div className="flex items-center gap-2">
            <a
              href={cdnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 truncate"
            >
              {cdnUrl}
            </a>
            <button
              onClick={handleCopy}
              className="shrink-0 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={cdnUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
            >
              Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
