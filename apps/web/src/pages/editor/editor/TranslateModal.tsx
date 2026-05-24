import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useEditorStore } from '../../../store/editorStore';
import api from '../../../lib/api';

const LANGUAGES = [
  { code: 'ar', name: 'Arabic', dir: 'rtl' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
];

export default function TranslateModal() {
  const setShowTranslateModal = useEditorStore((s) => s.setShowTranslateModal);
  const siteJson = useEditorStore((s) => s.siteJson);
  const updateSectionProps = useEditorStore((s) => s.updateSectionProps);
  const [targetLang, setTargetLang] = useState('fr');
  const [translatedIds, setTranslatedIds] = useState<Set<string>>(new Set());

  const translateMutation = useMutation({
    mutationFn: async () => {
      if (!siteJson) return;
      const results: { sectionId: string; props: Record<string, unknown> }[] = [];
      for (const section of siteJson.sections) {
        const { data } = await api.post('/api/editor/translate', {
          sectionType: section.type,
          props: section.props,
          targetLanguage: targetLang,
        });
        results.push({ sectionId: section.id, props: data.props });
      }
      return results;
    },
    onSuccess: (results) => {
      if (!results) return;
      for (const r of results) {
        updateSectionProps(r.sectionId, r.props);
        setTranslatedIds((prev) => new Set(prev).add(r.sectionId));
      }
      setShowTranslateModal(false);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTranslateModal(false)}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">AI Translate</h2>
          <button onClick={() => setShowTranslateModal(false)} className="text-gray-400 hover:text-white">&#x2715;</button>
        </div>

        <p className="text-sm text-gray-400 mb-4">Translate all section content to your chosen language.</p>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white mb-6 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
          ))}
        </select>

        {translateMutation.isError && (
          <p className="text-sm text-red-400 mb-4">
            {(translateMutation.error as any)?.response?.data?.error || 'Translation failed'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={() => setShowTranslateModal(false)} className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-700">Cancel</button>
          <button
            onClick={() => translateMutation.mutate()}
            disabled={translateMutation.isPending}
            className="px-5 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-40"
          >
            {translateMutation.isPending ? 'Translating...' : `Translate to ${LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}`}
          </button>
        </div>
      </div>
    </div>
  );
}
