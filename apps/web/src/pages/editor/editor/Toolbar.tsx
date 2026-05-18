import { useEditorStore, type PreviewMode } from '../../../store/editorStore';

const PREVIEW_ICONS: Record<PreviewMode, string> = {
  desktop: '\u{1F5A5}',
  tablet: '\u{1F4F1}',
  mobile: '\u{1F4F2}',
};

interface Props {
  projectId: string;
}

export default function Toolbar({ projectId }: Props) {
  const canUndo = useEditorStore((s) => s.historyIndex > 0);
  const canRedo = useEditorStore((s) => s.historyIndex < s.history.length - 1);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const setShowVersionHistory = useEditorStore((s) => s.setShowVersionHistory);
  const setShowAiRegen = useEditorStore((s) => s.setShowAiRegen);

  const saveStatus = isSaving
    ? 'Saving...'
    : isDirty
      ? 'Unsaved changes'
      : 'Saved';

  return (
    <header className="h-12 shrink-0 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <a
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-white mr-2"
        >
          &larr; Dashboard
        </a>
        <span className="text-sm font-medium">Editor</span>
        <span className="text-xs text-gray-500 ml-2">/ {projectId.slice(0, 8)}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="px-2 py-1 text-xs rounded disabled:opacity-30 hover:bg-gray-700"
          title="Undo (Cmd+Z)"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="px-2 py-1 text-xs rounded disabled:opacity-30 hover:bg-gray-700"
          title="Redo (Cmd+Shift+Z)"
        >
          Redo
        </button>

        <div className="w-px h-5 bg-gray-600 mx-2" />

        {(['desktop', 'tablet', 'mobile'] as PreviewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setPreviewMode(mode)}
            className={`px-2 py-1 text-xs rounded ${
              previewMode === mode ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
            }`}
          >
            {PREVIEW_ICONS[mode]} {mode}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-600 mx-2" />

        {selectedSectionId && (
          <button
            onClick={() => setShowAiRegen(true, selectedSectionId)}
            className="px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-500"
          >
            AI Regen
          </button>
        )}

        <button
          onClick={() => setShowVersionHistory(true)}
          className="px-2 py-1 text-xs rounded hover:bg-gray-700"
        >
          History
        </button>

        <div className="w-px h-5 bg-gray-600 mx-2" />

        <span className={`text-xs ${isDirty ? 'text-yellow-400' : 'text-green-400'}`}>
          {saveStatus}
        </span>
      </div>
    </header>
  );
}
