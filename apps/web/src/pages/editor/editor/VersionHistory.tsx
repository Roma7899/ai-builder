import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditorStore } from '../../../store/editorStore';
import api from '../../../lib/api';

interface Props {
  projectId: string;
}

interface Version {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

export default function VersionHistory({ projectId }: Props) {
  const setShowVersionHistory = useEditorStore((s) => s.setShowVersionHistory);
  const loadSiteJson = useEditorStore((s) => s.loadSiteJson);
  const currentVersion = useEditorStore((s) => s.projectVersion);
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: ['editor-versions', projectId],
    queryFn: async () => {
      const { data } = await api.get<Version[]>(
        `/api/editor/projects/${projectId}/versions`
      );
      return data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (version: number) => {
      const { data } = await api.post(
        `/api/editor/projects/${projectId}/versions/${version}/restore`
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['editor-versions', projectId] });
      if (data.siteJson) {
        loadSiteJson(projectId, data.siteJson, data.version);
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/50"
        onClick={() => setShowVersionHistory(false)}
      />
      <div className="w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold">Version History</h2>
          <button
            onClick={() => setShowVersionHistory(false)}
            className="text-gray-400 hover:text-white"
          >
            &#x2715;
          </button>
        </div>

        {isLoading && (
          <div className="p-4 text-sm text-gray-400">Loading...</div>
        )}

        <div className="divide-y divide-gray-700">
          {(versions ?? []).map((v) => (
            <div
              key={v.id}
              className={`p-4 flex items-center justify-between ${
                v.version === currentVersion
                  ? 'bg-blue-600/10'
                  : 'hover:bg-gray-700/50'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Version {v.version}
                  </span>
                  {v.version === currentVersion && (
                    <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(v.createdAt).toLocaleString()}
                  {v.createdBy === 'ai' ? ' (AI generated)' : ''}
                </p>
              </div>
              {v.version !== currentVersion && (
                <button
                  onClick={() => restoreMutation.mutate(v.version)}
                  disabled={restoreMutation.isPending}
                  className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-40"
                >
                  {restoreMutation.isPending ? '...' : 'Restore'}
                </button>
              )}
            </div>
          ))}
        </div>

        {versions?.length === 0 && !isLoading && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No version history yet
          </div>
        )}
      </div>
    </div>
  );
}
