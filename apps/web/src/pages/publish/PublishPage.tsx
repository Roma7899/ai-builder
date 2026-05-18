import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import DeploymentStatus from './publish/DeploymentStatus';
import DomainWizard from './publish/DomainWizard';
import ExportButton from './publish/ExportButton';
import api from '../../lib/api';

export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['editor-project', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/api/editor/projects/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (!id) return <Navigate to="/dashboard" replace />;

  const handlePublish = async () => {
    setDeployError(null);
    try {
      const { data } = await api.post(`/api/publish/projects/${id}`);
      setDeploymentId(data.deploymentId);
    } catch (err: any) {
      setDeployError(err.response?.data?.error ?? 'Failed to start deployment');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <a href={`/editor/${id}`} className="text-sm text-gray-400 hover:text-white">
              &larr; Back to Editor
            </a>
            <h1 className="text-lg font-semibold mt-1">Publish</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Deploy section */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="font-semibold mb-2">Deploy to CDN</h2>
          <p className="text-sm text-gray-400 mb-4">
            Publish the latest version of your site to our global CDN.
          </p>

          {!deploymentId ? (
            <div>
              <button
                onClick={handlePublish}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-sm"
              >
                Publish Now
              </button>
              {deployError && (
                <p className="text-sm text-red-400 mt-2">{deployError}</p>
              )}
            </div>
          ) : (
            <DeploymentStatus
              projectId={id}
              deploymentId={deploymentId}
              onDone={(cdnUrl) => {
                // Deployment complete
              }}
            />
          )}
        </section>

        {/* Custom Domain */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="font-semibold mb-2">Custom Domain</h2>
          <p className="text-sm text-gray-400 mb-4">
            Connect your own domain name to this site.
          </p>
          <DomainWizard projectId={id} />
        </section>

        {/* Export */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="font-semibold mb-2">Export Site</h2>
          <p className="text-sm text-gray-400 mb-4">
            Download a ZIP file containing your site's HTML to host it anywhere.
          </p>
          <ExportButton projectId={id} />
        </section>
      </main>
    </div>
  );
}
