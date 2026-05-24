import { useState } from 'react';
import { useEditorStore } from '../../../store/editorStore';

const THEME_PRESETS = [
  { name: 'Blue Professional', primary_color: '#2563EB', font_heading: 'Inter', font_body: 'Inter', border_radius: '8px' },
  { name: 'Purple Modern', primary_color: '#7C3AED', font_heading: 'Plus Jakarta Sans', font_body: 'Inter', border_radius: '12px' },
  { name: 'Green Nature', primary_color: '#059669', font_heading: 'DM Sans', font_body: 'Inter', border_radius: '6px' },
  { name: 'Red Bold', primary_color: '#DC2626', font_heading: 'Inter', font_body: 'Inter', border_radius: '4px' },
  { name: 'Dark Minimal', primary_color: '#1E293B', font_heading: 'Outfit', font_body: 'Manrope', border_radius: '8px' },
  { name: 'Orange Vibrant', primary_color: '#EA580C', font_heading: 'Inter', font_body: 'Plus Jakarta Sans', border_radius: '10px' },
  { name: 'Teal Modern', primary_color: '#0D9488', font_heading: 'Satoshi', font_body: 'Inter', border_radius: '8px' },
  { name: 'Pink Playful', primary_color: '#DB2777', font_heading: 'Poppins', font_body: 'Inter', border_radius: '16px' },
  { name: 'Indigo Deep', primary_color: '#4338CA', font_heading: 'Manrope', font_body: 'DM Sans', border_radius: '8px' },
  { name: 'Amber Warm', primary_color: '#D97706', font_heading: 'Playfair Display', font_body: 'Inter', border_radius: '6px' },
];

export default function ThemePanel() {
  const siteJson = useEditorStore((s) => s.siteJson);
  const applyThemePreset = useEditorStore((s) => s.applyThemePreset);
  const updateTheme = useEditorStore((s) => s.updateTheme);
  const setShowThemePanel = useEditorStore((s) => s.setShowThemePanel);
  const [customColor, setCustomColor] = useState(siteJson?.theme?.primary_color || '#2563EB');

  if (!siteJson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowThemePanel(false)}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Color Theme</h2>
          <button onClick={() => setShowThemePanel(false)} className="text-gray-400 hover:text-white">&#x2715;</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyThemePreset(preset)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                siteJson.theme.primary_color === preset.primary_color
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: preset.primary_color }} />
              <div className="text-left">
                <div className="text-sm font-medium text-white">{preset.name}</div>
                <div className="text-xs text-gray-400">{preset.font_heading} / {preset.font_body}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Custom Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
              maxLength={7}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => updateTheme({ primary_color: customColor })}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
