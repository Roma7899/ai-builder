import { useEffect, useState, useRef } from 'react';
import { useStartGeneration, createGenerationEventSource, type StylePreferences } from '../../../hooks/useGeneration';
import api from '../../../lib/api';

interface Props {
  prompt: string;
  stylePreferences?: StylePreferences;
  projectId: string | null;
  onProjectReady: (projectId: string, version: number) => void;
  onProjectCreated: (projectId: string) => void;
}

const STATUS_MESSAGES = [
  'Analyzing your business...',
  'Crafting your sections...',
  'Designing your layout...',
  'Writing your content...',
  'Polishing the details...',
  'Finalizing your site...',
];

export default function GeneratingStep({
  prompt,
  stylePreferences,
  projectId,
  onProjectReady,
  onProjectCreated,
}: Props) {
  const { mutateAsync: startGeneration, isPending } = useStartGeneration();
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('preparing');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  // Rotating status messages
  useEffect(() => {
    if (status !== 'running' && status !== 'preparing') return;
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [status]);

  // Create a project then start generation
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Step 1: Create project if needed
        let pid = projectId;
        if (!pid) {
          setMessage('Creating project...');
          const { data } = await api.post('/api/projects', {
            name: `Generated Site - ${new Date().toLocaleDateString()}`,
          });
          pid = data.id;
          if (!cancelled) onProjectCreated(pid);
        }

        // Step 2: Start generation
        setMessage('Queuing generation...');
        const result = await startGeneration({
          projectId: pid!,
          prompt,
          stylePreferences,
        });

        if (cancelled) return;
        setJobId(result.jobId);
        setStatus('running');
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error ?? err.message ?? 'Failed to start generation');
          setStatus('failed');
        }
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE listener
  useEffect(() => {
    if (!jobId) return;

    const apiBaseUrl = import.meta.env.VITE_API_URL;
    const es = createGenerationEventSource(jobId, apiBaseUrl);
    esRef.current = es;

    es.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data.status);
        setMessage(data.message ?? '');
        setProgress(data.progress ?? 0);

        if (data.status === 'done') {
          es.close();
          onProjectReady(data.projectId, data.version);
        }

        if (data.status === 'failed') {
          es.close();
          setError(data.error ?? data.message ?? 'Generation failed');
        }
      } catch { /* ignore malformed events */ }
    });

    es.onerror = () => {
      es.close();
      setError('Connection lost. Please check the generation status.');
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId, onProjectReady]);

  const handleRetry = () => {
    setError(null);
    setStatus('preparing');
    setProgress(0);
    setJobId(null);
    setMessage('');

    async function restart() {
      try {
        setMessage('Queuing generation...');
        let pid = projectId;
        if (!pid) {
          const { data } = await api.post('/api/projects', {
            name: `Generated Site - ${new Date().toLocaleDateString()}`,
          });
          pid = data.id;
          onProjectCreated(pid);
        }
        const result = await startGeneration({
          projectId: pid!,
          prompt,
          stylePreferences,
        });
        setJobId(result.jobId);
        setStatus('running');
      } catch (err: any) {
        setError(err.response?.data?.error ?? err.message ?? 'Failed to start generation');
        setStatus('failed');
      }
    }

    restart();
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {status === 'preparing' && (
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-600">{message || 'Preparing...'}</p>
        </div>
      )}

      {status === 'running' && (
        <div className="text-center w-full max-w-sm">
          <div className="relative mb-8">
            <div className="w-16 h-16 mx-auto">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <div className="flex gap-1 justify-center mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 95)}%` }}
              />
            </div>
          </div>

          <p className="text-gray-600 font-medium">
            {message || STATUS_MESSAGES[messageIndex]}
          </p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-green-600">{'\u2713'}</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">Website generated!</p>
          <p className="text-gray-500 mt-1">Redirecting to editor...</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-red-500">!</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Generation failed
          </p>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">{error}</p>
          <button
            onClick={handleRetry}
            disabled={isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {isPending ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      )}
    </div>
  );
}
