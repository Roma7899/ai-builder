import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useStartGeneration, createGenerationEventSource } from '../hooks/useGeneration';

interface Props {
  onClose: () => void;
}

const TONES = [
  { id: 'professional', label: 'Professional', gradient: 'from-blue-600 to-indigo-600' },
  { id: 'modern', label: 'Modern', gradient: 'from-purple-600 to-pink-500' },
  { id: 'minimal', label: 'Minimal', gradient: 'from-gray-800 to-gray-600' },
  { id: 'creative', label: 'Creative', gradient: 'from-amber-500 to-orange-600' },
];

const INDUSTRIES = [
  { id: '', label: 'General / Other' },
  { id: 'saas', label: 'SaaS / Tech' },
  { id: 'agency', label: 'Agency / Service' },
  { id: 'ecommerce', label: 'Ecommerce / Retail' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'restaurant', label: 'Restaurant / Food' },
  { id: 'health', label: 'Health / Fitness' },
  { id: 'education', label: 'Education' },
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'portfolio', label: 'Portfolio / Creative' },
];

const STATUS_MESSAGES = [
  'Analyzing your business...',
  'Crafting your sections...',
  'Designing your layout...',
  'Writing your content...',
  'Polishing the details...',
  'Finalizing your site...',
];

export default function NewProjectModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'failed'>('form');
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [tone, setTone] = useState('professional');
  const [industry, setIndustry] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/api/projects', { name });
      return data as { id: string };
    },
  });

  const startGeneration = useStartGeneration();

  useEffect(() => {
    if (step !== 'generating') return;
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (!jobId) return;

    const apiBaseUrl = import.meta.env.VITE_API_URL;
    const es = createGenerationEventSource(jobId, apiBaseUrl);
    esRef.current = es;

    es.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data.progress ?? 0);
        setStatusMessage(data.message ?? '');

        if (data.status === 'done') {
          es.close();
          setStep('done');
          setTimeout(() => {
            onClose();
            navigate(`/editor/${data.projectId}?version=${data.version}`);
          }, 1500);
        }

        if (data.status === 'failed') {
          es.close();
          setStep('failed');
          setError(data.error ?? data.message ?? 'Generation failed');
        }
      } catch { /* ignore malformed events */ }
    });

    es.onerror = () => {
      es.close();
      setStep('failed');
      setError('Connection lost. Please check the generation status.');
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId, navigate, onClose]);

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setStep('generating');
    setProgress(5);
    setStatusMessage('Creating project...');

    try {
      const name = projectName.trim() || `Generated Site - ${new Date().toLocaleDateString()}`;
      const project = await createMutation.mutateAsync(name);
      const pid = project.id;
      setProjectId(pid);

      setProgress(10);
      setStatusMessage('Queuing generation...');

      const toneDesc: Record<string, string> = {
        professional: 'Use a clean, corporate, and trust-focused design tone. Write with authority and professionalism.',
        modern: 'Use a bold, contemporary, and innovative design tone. Write with energy and forward-thinking language.',
        minimal: 'Use a clean, minimalist, and elegant design tone. Write with clarity and precision — less is more.',
        creative: 'Use a vibrant, expressive, and artistic design tone. Write with personality and creative flair.',
      };

      const promptParts = [
        `Business description: ${description}`,
        `Design tone: ${toneDesc[tone] || toneDesc.professional}`,
      ];
      if (industry) {
        promptParts.push(`Industry: ${industry}`);
      }
      const prompt = promptParts.join('\n');

      const result = await startGeneration.mutateAsync({
        projectId: pid,
        prompt,
        stylePreferences: {
          industryType: industry || undefined,
        },
      });

      setJobId(result.jobId);
      setStatusMessage('Generation started...');
    } catch (err: any) {
      setStep('failed');
      setError(err.response?.data?.error ?? err.message ?? 'Failed to start');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {step === 'form' ? 'Create Your Website' : 'Generating Your Site'}
              </h2>
              <p className="text-blue-200 text-sm mt-1">
                {step === 'form'
                  ? 'Describe your website and AI will build it for you'
                  : 'AI is building your professional website...'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {step === 'form' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Describe your website or business
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. A modern SaaS platform that helps small businesses automate their social media scheduling and analytics. Our target audience is marketing managers at startups who need an easy way to manage multiple accounts..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Be specific about what your business does and who it serves
                </p>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Project name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome Site"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Industry + Tone in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Design Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tone preview pills */}
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      tone === t.id
                        ? `bg-gradient-to-r ${t.gradient} text-white border-transparent`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Action */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!description.trim() || createMutation.isPending}
                  className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl disabled:opacity-40 hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {createMutation.isPending ? 'Creating...' : 'Generate Website'}
                </button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="py-8 text-center">
              <div className="relative mb-8">
                <div className="w-16 h-16 mx-auto">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              </div>

              <div className="max-w-sm mx-auto mb-6">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 95)}%` }}
                  />
                </div>
              </div>

              <p className="text-gray-700 font-medium">
                {statusMessage || STATUS_MESSAGES[messageIndex]}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                This usually takes 30-60 seconds
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-bold text-gray-900">Website Created!</p>
              <p className="text-gray-500 mt-1">Opening your editor...</p>
            </div>
          )}

          {step === 'failed' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-2">Generation Failed</p>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{error}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setStep('form'); setError(null); }}
                  className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
