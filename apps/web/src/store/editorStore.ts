import { create } from 'zustand';
import type { SiteJSON, SectionNode } from '../types/site.types';

export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

interface EditorState {
  siteJson: SiteJSON | null;
  projectId: string | null;
  projectVersion: number;
  history: SiteJSON[];
  historyIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  selectedSectionId: string | null;
  previewMode: PreviewMode;
  showVersionHistory: boolean;
  showAiRegen: boolean;
  regenSectionId: string | null;

  loadSiteJson: (projectId: string, siteJson: SiteJSON, version: number) => void;
  updateSectionProp: (sectionId: string, prop: string, value: unknown) => void;
  updateSectionProps: (sectionId: string, props: Record<string, unknown>) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  deleteSection: (sectionId: string) => void;
  addSection: (sectionType: string, afterSectionId?: string) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
  selectSection: (sectionId: string | null) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setShowVersionHistory: (show: boolean) => void;
  setShowAiRegen: (show: boolean, sectionId?: string) => void;
}

const MAX_HISTORY = 50;

function pushHistory(
  history: SiteJSON[],
  index: number,
  siteJson: SiteJSON
): { history: SiteJSON[]; index: number } {
  const trimmed = history.slice(0, index + 1);
  trimmed.push(JSON.parse(JSON.stringify(siteJson)));
  if (trimmed.length > MAX_HISTORY) trimmed.shift();
  return { history: trimmed, index: trimmed.length - 1 };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  siteJson: null,
  projectId: null,
  projectVersion: 0,
  history: [],
  historyIndex: -1,
  isDirty: false,
  isSaving: false,
  selectedSectionId: null,
  previewMode: 'desktop',
  showVersionHistory: false,
  showAiRegen: false,
  regenSectionId: null,

  loadSiteJson: (projectId, siteJson, version) => {
    const cloned = JSON.parse(JSON.stringify(siteJson));
    set({
      projectId,
      siteJson: cloned,
      projectVersion: version,
      history: [cloned],
      historyIndex: 0,
      isDirty: false,
      selectedSectionId: null,
    });
  },

  updateSectionProp: (sectionId, prop, value) => {
    const { siteJson, history, historyIndex } = get();
    if (!siteJson) return;

    const next = JSON.parse(JSON.stringify(siteJson));
    const section = next.sections.find((s: SectionNode) => s.id === sectionId);
    if (!section) return;

    section.props[prop] = value;

    const { history: newHistory, index: newIndex } = pushHistory(history, historyIndex, next);
    set({ siteJson: next, history: newHistory, historyIndex: newIndex, isDirty: true });
  },

  updateSectionProps: (sectionId, props) => {
    const { siteJson, history, historyIndex } = get();
    if (!siteJson) return;

    const next = JSON.parse(JSON.stringify(siteJson));
    const section = next.sections.find((s: SectionNode) => s.id === sectionId);
    if (!section) return;

    Object.assign(section.props, props);

    const { history: newHistory, index: newIndex } = pushHistory(history, historyIndex, next);
    set({ siteJson: next, history: newHistory, historyIndex: newIndex, isDirty: true });
  },

  reorderSections: (oldIndex, newIndex) => {
    const { siteJson, history, historyIndex } = get();
    if (!siteJson) return;

    const next = JSON.parse(JSON.stringify(siteJson));
    const sections = [...next.sections];
    const [moved] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, moved);
    sections.forEach((s: SectionNode, i: number) => { s.order = i; });
    next.sections = sections;

    const { history: newHistory, index: hi } = pushHistory(history, historyIndex, next);
    set({ siteJson: next, history: newHistory, historyIndex: hi, isDirty: true });
  },

  toggleSectionVisibility: (sectionId) => {
    const { siteJson, history, historyIndex } = get();
    if (!siteJson) return;

    const next = JSON.parse(JSON.stringify(siteJson));
    const section = next.sections.find((s: SectionNode) => s.id === sectionId);
    if (!section) return;

    section.visible = !section.visible;

    const { history: newHistory, index: newIndex } = pushHistory(history, historyIndex, next);
    set({ siteJson: next, history: newHistory, historyIndex: newIndex, isDirty: true });
  },

  deleteSection: (sectionId) => {
    const { siteJson, history, historyIndex } = get();
    if (!siteJson) return;

    const next = JSON.parse(JSON.stringify(siteJson));
    next.sections = next.sections.filter((s: SectionNode) => s.id !== sectionId);
    next.sections.forEach((s: SectionNode, i: number) => { s.order = i; });

    const { history: newHistory, index: newIndex } = pushHistory(history, historyIndex, next);
    set({
      siteJson: next,
      history: newHistory,
      historyIndex: newIndex,
      isDirty: true,
      selectedSectionId: get().selectedSectionId === sectionId ? null : get().selectedSectionId,
    });
  },

  addSection: (sectionType, afterSectionId) => {
    const { siteJson, history, historyIndex } = get();
    if (!siteJson) return;

    const next = JSON.parse(JSON.stringify(siteJson));
    const newSection: SectionNode = {
      id: `${sectionType}-${Math.random().toString(36).slice(2, 9)}`,
      type: sectionType as any,
      order: 0,
      visible: true,
      props: {},
    };

    const insertIndex = afterSectionId
      ? next.sections.findIndex((s: SectionNode) => s.id === afterSectionId) + 1
      : next.sections.length;

    next.sections.splice(insertIndex, 0, newSection);
    next.sections.forEach((s: SectionNode, i: number) => { s.order = i; });

    const { history: newHistory, index: newIndex } = pushHistory(history, historyIndex, next);
    set({
      siteJson: next,
      history: newHistory,
      historyIndex: newIndex,
      isDirty: true,
      selectedSectionId: newSection.id,
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      siteJson: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
      isDirty: true,
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      siteJson: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
      isDirty: true,
    });
  },

  markSaved: () => set({ isDirty: false }),
  setSaving: (saving) => set({ isSaving: saving }),
  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setShowVersionHistory: (show) => set({ showVersionHistory: show }),
  setShowAiRegen: (show, sectionId) =>
    set({ showAiRegen: show, regenSectionId: sectionId ?? null }),
}));
