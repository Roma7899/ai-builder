import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useEditorStore } from '../../../store/editorStore';
import { SECTION_TYPE_LABELS } from '../../../config/sectionPropSchemas';
import api from '../../../lib/api';

interface Props {
  sectionId: string;
  onClose: () => void;
}

export default function AiEditModal({ sectionId, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const siteJson = useEditorStore((s) => s.siteJson);
  const updateSectionProps = useEditorStore((s) => s.updateSectionProps);
  const section = siteJson?.sections.find((s) => s.id === sectionId);

  const editMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/editor/ai-edit', {
        sectionId,
        sectionType: section?.type,
        currentProps: section?.props,
        prompt,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.props) {
        updateSectionProps(sectionId, data.props);
      }
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">
            AI Edit{' '}
            <span className="text-blue-400">{SECTION_TYPE_LABELS[section?.type ?? ''] || section?.type}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&#x2715;</button>
        </div>

        <p className="text-sm text-gray-400 mb-4">Describe how you want to change this section's content. The AI will rewrite it while preserving structure.</p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make the headline more compelling and add customer-focused language..."
          rows={4}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        {editMutation.isError && (
          <p className="text-sm text-red-400 mt-2">
            {(editMutation.error as any)?.response?.data?.error || 'Edit failed'}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
          <button
            onClick={() => editMutation.mutate()}
            disabled={!prompt.trim() || editMutation.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium disabled:opacity-40"
          >
            {editMutation.isPending ? 'Editing...' : 'Apply Edit'}
          </button>
        </div>
      </div>
    </div>
  );
}
