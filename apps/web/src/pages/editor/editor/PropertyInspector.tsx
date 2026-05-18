import { useMemo } from 'react';
import { useEditorStore } from '../../../store/editorStore';
import { getSectionSchema, SECTION_TYPE_LABELS, type FieldDef } from '../../../config/sectionPropSchemas';

export default function PropertyInspector() {
  const siteJson = useEditorStore((s) => s.siteJson);
  const selectedSectionId = useEditorStore((s) => s.selectedSectionId);
  const updateSectionProp = useEditorStore((s) => s.updateSectionProp);

  const selectedSection = useMemo(() => {
    if (!siteJson || !selectedSectionId) return null;
    return siteJson.sections.find((s) => s.id === selectedSectionId) ?? null;
  }, [siteJson, selectedSectionId]);

  const schema = useMemo(() => {
    if (!selectedSection) return {};
    return getSectionSchema(selectedSection.type);
  }, [selectedSection]);

  if (!selectedSection) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 text-center mt-20">
          Select a section to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {SECTION_TYPE_LABELS[selectedSection.type] || selectedSection.type}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {Object.entries(schema).map(([fieldName, fieldDef]) => (
          <FieldEditor
            key={fieldName}
            fieldName={fieldName}
            fieldDef={fieldDef}
            value={selectedSection.props[fieldName]}
            sectionId={selectedSection.id}
            onChange={(value) => updateSectionProp(selectedSection.id, fieldName, value)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldEditor({
  fieldName,
  fieldDef,
  value,
  sectionId,
  onChange,
}: {
  fieldName: string;
  fieldDef: FieldDef;
  value: unknown;
  sectionId: string;
  onChange: (value: unknown) => void;
}) {
  switch (fieldDef.type) {
    case 'text':
    case 'url':
    case 'image':
      return (
        <FieldWrapper label={fieldDef.label}>
          <input
            type={fieldDef.type === 'url' ? 'url' : 'text'}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder}
            maxLength={fieldDef.maxLength}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {fieldDef.type === 'image' && value && String(value).length > 0 && (
            <img
              src={String(value)}
              alt="Preview"
              className="mt-2 w-full h-20 object-cover rounded border border-gray-600"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </FieldWrapper>
      );

    case 'textarea':
      return (
        <FieldWrapper label={fieldDef.label}>
          <textarea
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldDef.placeholder}
            maxLength={fieldDef.maxLength}
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </FieldWrapper>
      );

    case 'color':
      return (
        <FieldWrapper label={fieldDef.label}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(value ?? '#000000')}
              onChange={(e) => onChange(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={String(value ?? '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              maxLength={7}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </FieldWrapper>
      );

    case 'select':
      return (
        <FieldWrapper label={fieldDef.label}>
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(fieldDef.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </FieldWrapper>
      );

    case 'boolean':
      return (
        <FieldWrapper label={fieldDef.label}>
          <button
            onClick={() => onChange(!value)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              value ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                value ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </FieldWrapper>
      );

    case 'array':
      return (
        <ArrayEditor
          fieldName={fieldName}
          fieldDef={fieldDef}
          value={value}
          sectionId={sectionId}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function ArrayEditor({
  fieldName: _fn,
  fieldDef,
  value,
  sectionId,
  onChange,
}: {
  fieldName: string;
  fieldDef: FieldDef;
  value: unknown;
  sectionId: string;
  onChange: (value: unknown) => void;
}) {
  const items = (Array.isArray(value) ? value : [{}]) as Record<string, unknown>[];
  const innerFields = fieldDef.fields ?? {};

  const handleItemChange = (index: number, prop: string, val: unknown) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [prop]: val } : item
    );
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, {}]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-gray-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{fieldDef.label}</span>
        <button
          onClick={addItem}
          className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded"
        >
          + Add
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="bg-gray-750 rounded p-2 space-y-2 border border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Item {i + 1}</span>
            <button
              onClick={() => removeItem(i)}
              className="text-xs text-gray-500 hover:text-red-400"
            >
              &#x2715;
            </button>
          </div>
          {Object.entries(innerFields).map(([prop, def]) => {
            const isLinksField = prop === 'links';
            const isFeaturesField = prop === 'features';

            if (isLinksField || isFeaturesField) {
              const listVal = (item[prop] as string) ?? '';
              return (
                <div key={prop}>
                  <label className="block text-xs text-gray-500 mb-0.5">{def.label}</label>
                  <input
                    type="text"
                    value={listVal}
                    onChange={(e) => handleItemChange(i, prop, e.target.value)}
                    placeholder={def.placeholder}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
              );
            }

            return (
              <div key={prop}>
                <label className="block text-xs text-gray-500 mb-0.5">{def.label}</label>
                {def.type === 'textarea' ? (
                  <textarea
                    value={String(item[prop] ?? '')}
                    onChange={(e) => handleItemChange(i, prop, e.target.value)}
                    placeholder={def.placeholder}
                    rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none resize-none"
                  />
                ) : def.type === 'boolean' ? (
                  <button
                    onClick={() => handleItemChange(i, prop, !item[prop])}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      item[prop] ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                        item[prop] ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <input
                    type={def.type === 'url' ? 'url' : 'text'}
                    value={String(item[prop] ?? '')}
                    onChange={(e) => handleItemChange(i, prop, e.target.value)}
                    placeholder={def.placeholder}
                    maxLength={def.maxLength}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
