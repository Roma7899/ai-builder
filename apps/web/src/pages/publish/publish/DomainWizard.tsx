import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../lib/api';

interface Props {
  projectId: string;
}

export default function DomainWizard({ projectId }: Props) {
  const [step, setStep] = useState<'input' | 'dns' | 'verifying' | 'verified' | 'error'>('input');
  const [domain, setDomain] = useState('');
  const [txtRecord, setTxtRecord] = useState('');
  const [txtName, setTxtName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAddDomain = async () => {
    setError(null);
    try {
      const { data } = await api.post(`/api/domains/projects/${projectId}`, { domain });
      setTxtRecord(data.txtRecord);
      setTxtName(data.txtName);
      setStep('dns');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add domain');
    }
  };

  const startVerifying = () => {
    setStep('verifying');
    setPollCount(0);
  };

  const pollVerification = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/domains/projects/${projectId}/verify`);
      setPollCount((c) => c + 1);

      if (data.verified) {
        setStep('verified');
        if (pollTimer.current) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      }
    } catch {
      // Keep polling
    }
  }, [projectId]);

  useEffect(() => {
    if (step !== 'verifying') return;

    pollTimer.current = setInterval(pollVerification, 10000);
    pollVerification();

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [step, pollVerification]);

  return (
    <div>
      {step === 'input' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAddDomain}
              disabled={!domain.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              Add Domain
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {step === 'dns' && (
        <div className="space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Add this DNS TXT record to verify ownership:</p>
            <div className="bg-gray-900 rounded p-3 font-mono text-xs space-y-1">
              <p>
                <span className="text-gray-400">Type:</span> TXT
              </p>
              <p>
                <span className="text-gray-400">Name:</span> {txtName}
              </p>
              <p className="break-all">
                <span className="text-gray-400">Value:</span>{' '}
                <span className="text-blue-300">{txtRecord}</span>
              </p>
            </div>
            <button
              onClick={startVerifying}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
            >
              I've added the record — Verify Now
            </button>
          </div>
        </div>
      )}

      {step === 'verifying' && (
        <div className="space-y-3">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-300">Checking DNS records...</p>
            <p className="text-xs text-gray-500 mt-1">
              Polling for TXT record (attempt {pollCount})...
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Make sure the TXT record <code className="text-blue-300">{txtRecord}</code> is added
              to <code className="text-blue-300">{txtName}</code>
            </p>
          </div>
        </div>
      )}

      {step === 'verified' && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold">&#10003;</span>
          </div>
          <p className="font-medium text-green-400">Domain Verified!</p>
          <p className="text-sm text-gray-400 mt-1">
            Your domain <span className="text-white">{domain}</span> is now connected.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            SSL certificate will be provisioned automatically.
          </p>
        </div>
      )}
    </div>
  );
}
