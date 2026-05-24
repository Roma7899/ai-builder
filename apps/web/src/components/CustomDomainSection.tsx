import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

interface Props {
  projectId: string;
  currentDomain?: string | null;
  isVerified?: boolean;
}

export default function CustomDomainSection({ projectId, currentDomain, isVerified }: Props) {
  const [domain, setDomain] = useState(currentDomain || '');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put(`/api/projects/${projectId}`, {
        domainCustom: domain,
      });
      return data;
    },
    onSuccess: () => alert('Domain saved! Configure your DNS:'),
  });

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h3 className="font-semibold text-white mb-1">Custom Domain</h3>
      <p className="text-sm text-gray-400 mb-4">Connect your own domain to this project.</p>

      <div className="flex gap-2 mb-4">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yoursite.com"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!domain.trim() || saveMutation.isPending}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-40"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-green-400 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Domain verified
        </div>
      )}

      {domain && !isVerified && (
        <div className="bg-gray-700/50 rounded-lg p-4 text-sm">
          <p className="text-gray-300 font-medium mb-2">DNS Configuration Instructions:</p>
          <p className="text-gray-400 mb-1">Add a CNAME record to your DNS provider:</p>
          <code className="block bg-gray-900 text-green-300 px-3 py-2 rounded text-xs mb-2">
            Type: CNAME<br />
            Name: @ (or your subdomain)<br />
            Value: cdn.yourproject.ai<br />
            TTL: 3600 (or default)
          </code>
          <p className="text-gray-500 text-xs">DNS changes can take up to 48 hours to propagate. We'll verify automatically.</p>
        </div>
      )}

      {saveMutation.isError && (
        <p className="text-sm text-red-400 mt-2">
          {(saveMutation.error as any)?.response?.data?.error || 'Failed to save domain'}
        </p>
      )}
    </div>
  );
}
