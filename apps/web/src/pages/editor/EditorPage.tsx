import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditorStore } from '../../store/editorStore';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useEditorKeyboard } from '../../hooks/useEditorKeyboard';
import { useAuth } from '../../context/AuthContext';
import Toolbar from './editor/Toolbar';
import SectionTree from './editor/SectionTree';
import PreviewIframe from './editor/PreviewIframe';
import PropertyInspector from './editor/PropertyInspector';
import VersionHistory from './editor/VersionHistory';
import AiRegenModal from './editor/AiRegenModal';
import ThemePanel from './editor/ThemePanel';
import FontPanel from './editor/FontPanel';
import TranslateModal from './editor/TranslateModal';
import SeoPanel from './editor/SeoPanel';
import api from '../../lib/api';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const loadSiteJson = useEditorStore((s) => s.loadSiteJson);
  const showVersionHistory = useEditorStore((s) => s.showVersionHistory);
  const showThemePanel = useEditorStore((s) => s.showThemePanel);
  const showFontPanel = useEditorStore((s) => s.showFontPanel);
  const showTranslateModal = useEditorStore((s) => s.showTranslateModal);
  const showSeoPanel = useEditorStore((s) => s.showSeoPanel);
  const showAiRegen = useEditorStore((s) => s.showAiRegen);
  const regenSectionId = useEditorStore((s) => s.regenSectionId);

  const { triggerImmediateSave } = useAutoSave();
  useEditorKeyboard(triggerImmediateSave);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['editor-project', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await api.get(`/api/editor/projects/${id}`);
      return data;
    },
    staleTime: 30000,
    enabled: !!id,
    retry: 1,
  });

  const storeProjectId = useEditorStore((s) => s.projectId);
  const storeSiteJson = useEditorStore((s) => s.siteJson);
  const needsHydration = data && (storeProjectId !== id || !storeSiteJson);

  useEffect(() => {
    if (!needsHydration) return;
    loadSiteJson(id!, data.siteJson, data.version);
  }, [needsHydration, id, data, loadSiteJson]);

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!id) return <Navigate to="/dashboard" replace />;
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading editor...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Toolbar projectId={id} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 border-r border-gray-700 bg-gray-800 overflow-y-auto">
          <SectionTree />
        </aside>
        <main className="flex-1 flex items-start justify-center overflow-auto bg-gray-950 p-4">
          <PreviewIframe projectId={id} />
        </main>
        <aside className="w-80 shrink-0 border-l border-gray-700 bg-gray-800 overflow-y-auto">
          <PropertyInspector />
        </aside>
      </div>
      {showVersionHistory && <VersionHistory projectId={id} />}
      {showThemePanel && <ThemePanel />}
      {showFontPanel && <FontPanel />}
      {showTranslateModal && <TranslateModal />}
      {showSeoPanel && <SeoPanel />}
      {showAiRegen && regenSectionId && (
        <AiRegenModal projectId={id} sectionId={regenSectionId} />
      )}
    </div>
  );
}
