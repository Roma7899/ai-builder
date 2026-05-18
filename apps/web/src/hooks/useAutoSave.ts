import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import api from '../lib/api';
import { queryClient } from '../main';

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceSaveRef = useRef(false);

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state) => {
      if (!state.isDirty || !state.siteJson || !state.projectId) return;

      if (forceSaveRef.current) {
        forceSaveRef.current = false;
        performSave(state.siteJson, state.projectId);
        return;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        performSave(state.siteJson, state.projectId);
      }, 800);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    triggerImmediateSave: () => {
      const { siteJson, projectId } = useEditorStore.getState();
      if (!siteJson || !projectId) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      forceSaveRef.current = true;
      performSave(siteJson, projectId);
    },
  };
}

async function performSave(siteJson: unknown, projectId: string) {
  const { isSaving, markSaved, setSaving } = useEditorStore.getState();
  if (isSaving) return;

  setSaving(true);
  try {
    await api.patch(`/api/editor/projects/${projectId}`, { siteJson });
    markSaved();
    queryClient.invalidateQueries({ queryKey: ['editor-project', projectId] });
  } catch (err: any) {
    if (err.response?.status === 403) {
      markSaved();
    }
  } finally {
    setSaving(false);
  }
}
