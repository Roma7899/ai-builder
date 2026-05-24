import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '../../../store/editorStore';
import { SECTION_TYPE_LABELS } from '../../../config/sectionPropSchemas';
import AiEditModal from './AiEditModal';

const SECTION_TYPES = [
  'hero', 'features', 'pricing', 'testimonials', 'faq', 'contact_form',
  'gallery', 'team', 'cta_banner', 'stats', 'logo_strip', 'footer',
];

function SortableSection({ sectionId, type, visible, isSelected }: {
  sectionId: string;
  type: string;
  visible: boolean;
  isSelected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sectionId });

  const toggleVisibility = useEditorStore((s) => s.toggleSectionVisibility);
  const deleteSection = useEditorStore((s) => s.deleteSection);
  const selectSection = useEditorStore((s) => s.selectSection);
  const [showAiEdit, setShowAiEdit] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : visible ? 1 : 0.4,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-700 text-sm cursor-pointer ${
        isSelected ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-gray-700/50'
      }`}
      onClick={() => selectSection(sectionId)}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        &#x2630;
      </button>

      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          visible ? 'bg-green-400' : 'bg-gray-500'
        }`}
      />

      <span className="flex-1 truncate text-xs">
        {SECTION_TYPE_LABELS[type] || type}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleVisibility(sectionId);
        }}
        className="text-xs text-gray-500 hover:text-gray-300 shrink-0"
        title={visible ? 'Hide' : 'Show'}
      >
        {visible ? '\u{1F441}' : '\u{1F648}'}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowAiEdit(true);
        }}
        className="text-xs text-purple-400 hover:text-purple-300 shrink-0"
        title="AI Edit"
      >
        &#x2728;
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteSection(sectionId);
        }}
        className="text-xs text-gray-500 hover:text-red-400 shrink-0"
        title="Delete"
      >
        &#x2715;
      </button>
      {showAiEdit && <AiEditModal sectionId={sectionId} onClose={() => setShowAiEdit(false)} />}
    </div>
  );
}

export default function SectionTree() {
  const siteJson = useEditorStore((s) => s.siteJson);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
  const reorderSections = useEditorStore((s) => s.reorderSections);
  const addSection = useEditorStore((s) => s.addSection);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sections = siteJson?.sections ?? [];
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderSections(oldIndex, newIndex);
    }
  };

  const handleAddSection = (type: string) => {
    addSection(type, selectedSectionId ?? undefined);
    setShowAddMenu(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Sections ({sorted.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sorted.map((section) => (
              <SortableSection
                key={section.id}
                sectionId={section.id}
                type={section.type}
                visible={section.visible}
                isSelected={section.id === selectedSectionId}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-3 border-t border-gray-700 relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded"
        >
          + Add Section
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-700 border border-gray-600 rounded-lg p-2 grid grid-cols-3 gap-1 max-h-60 overflow-y-auto z-20">
            {SECTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleAddSection(type)}
                className="px-2 py-1.5 text-xs rounded hover:bg-gray-600 text-gray-200"
              >
                {SECTION_TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
