import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useEditorStore } from '../../../store/editorStore';
import api from '../../../lib/api';

export default function SeoPanel() {
  const setShowSeoPanel = useEditorStore((s) => s.setShowSeoPanel);
  const siteJson = useEditorStore((s) => s.siteJson);
  const loadSiteJson = useEditorStore((s) => s.loadSiteJson);
  const projectId = useEditorStore((s) => s.projectId);
  const [suggestions, setSuggestions] = useState<any>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!siteJson) return;
      const { data } = await api.post('/api/editor/seo', { siteJson });
      return data;
    },
    onSuccess: (data) => setSuggestions(data),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !suggestions) return;
      const { data } = await api.patch(`/api/editor/projects/${projectId}`, {
        siteJson: suggestions.siteJson,
      });
      return data;
    },
    onSuccess: (data) => {
      if (projectId && data?.siteJson) {
        loadSiteJson(projectId, data.siteJson, data.version);
      }
      setShowSeoPanel(false);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSeoPanel(false)}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">AI SEO Optimizer</h2>
          <button onClick={() => setShowSeoPanel(false)} className="text-gray-400 hover:text-white">&#x2715;</button>
        </div>

        {!suggestions ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-4">Analyze your site content and get AI-powered SEO suggestions.</p>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-40"
            >
              {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze SEO'}
            </button>
            {analyzeMutation.isError && (
              <p className="text-sm text-red-400 mt-4">
                {(analyzeMutation.error as any)?.response?.data?.error || 'Analysis failed'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-3xl font-bold ${suggestions.score >= 80 ? 'text-green-400' : suggestions.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {suggestions.score}/100
              </div>
              <div className="text-sm text-gray-400">SEO Score</div>
            </div>

            <div className="space-y-3">
              <SuggestionItem label="Page Title" original={suggestions.original?.title} suggested={suggestions.suggested?.title} />
              <SuggestionItem label="Meta Description" original={suggestions.original?.description} suggested={suggestions.suggested?.description} />
              {(suggestions.suggested?.keywords || []).length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-400 mb-1">Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.suggested.keywords.map((kw: string, i: number) => (
                      <span key={i} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setSuggestions(null)} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-700">Discard</button>
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="px-5 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-40"
              >
                {applyMutation.isPending ? 'Applying...' : 'Apply Suggestions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionItem({ label, original, suggested }: { label: string; original?: string; suggested?: string }) {
  if (!original && !suggested) return null;
  return (
    <div className="bg-gray-700/50 rounded-lg p-3">
      <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-300 mb-1">Before: <span className="text-gray-500">{original || '(empty)'}</span></div>
      <div className="text-sm text-green-300">After: {suggested || '(no change)'}</div>
    </div>
  );
}
