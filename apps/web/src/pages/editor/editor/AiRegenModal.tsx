import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useEditorStore } from '../../../store/editorStore';
import { SECTION_TYPE_LABELS } from '../../../config/sectionPropSchemas';
import api from '../../../lib/api';

interface Props {
  projectId: string;
  sectionId: string;
}

export default function AiRegenModal({ projectId, sectionId }: Props) {
  const setShowAiRegen = useEditorStore((s) => s.setShowAiRegen);
  const updateSectionProps = useEditorStore((s) => s.updateSectionProps);
  const siteJson = useEditorStore((s) => s.siteJson);

  const section = siteJson?.sections.find((s) => s.id === sectionId);
  const [prompt, setPrompt] = useState('');

  const regenMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/api/editor/projects/${projectId}/sections/${sectionId}/regenerate`,
        { prompt }
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.props) {
        updateSectionProps(sectionId, data.props);
      }
      setShowAiRegen(false);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">
            AI Regenerate{' '}
            <span className="text-blue-400">
              {SECTION_TYPE_LABELS[section?.type ?? ''] || section?.type}
            </span>
          </h2>
          <button
            onClick={() => setShowAiRegen(false)}
            className="text-gray-400 hover:text-white"
          >
            &#x2715;
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Describe how you want to change this section's content. The AI will
          regenerate the text while preserving the section structure.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make it more professional and add a customer-focused headline..."
          rows={4}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        {regenMutation.isError && (
          <p className="text-sm text-red-400 mt-2">
            {(regenMutation.error as any)?.response?.data?.error ??
              'Failed to regenerate'}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setShowAiRegen(false)}
            className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => regenMutation.mutate()}
            disabled={!prompt.trim() || regenMutation.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-40"
          >
            {regenMutation.isPending ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}
