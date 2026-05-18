import { useState } from 'react';
import api from '../../../lib/api';

interface Props {
  projectId: string;
}

export default function ExportButton({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get(`/api/export/projects/${projectId}`);

      // Open download URL in a new tab
      window.open(data.downloadUrl, '_blank');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading}
        className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download ZIP
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}
