import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useEditorKeyboard(triggerSave: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
        return;
      }

      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      if (mod && e.key === 'Z') {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      if (mod && e.key === 's') {
        e.preventDefault();
        triggerSave();
        return;
      }

      if (e.key === 'Escape') {
        useEditorStore.getState().selectSection(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerSave]);
}
