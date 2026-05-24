import { useEditorStore } from '../../../store/editorStore';

const FONTS = [
  { name: 'Inter', type: 'sans-serif' },
  { name: 'Poppins', type: 'sans-serif' },
  { name: 'Roboto', type: 'sans-serif' },
  { name: 'Plus Jakarta Sans', type: 'sans-serif' },
  { name: 'DM Sans', type: 'sans-serif' },
  { name: 'Outfit', type: 'sans-serif' },
  { name: 'Manrope', type: 'sans-serif' },
  { name: 'Satoshi', type: 'sans-serif' },
  { name: 'Playfair Display', type: 'serif' },
  { name: 'Montserrat', type: 'sans-serif' },
];

function loadGoogleFont(fontName: string) {
  const family = fontName.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700;800&display=swap`;
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

export default function FontPanel() {
  const siteJson = useEditorStore((s) => s.siteJson);
  const updateTheme = useEditorStore((s) => s.updateTheme);
  const setShowFontPanel = useEditorStore((s) => s.setShowFontPanel);

  if (!siteJson) return null;

  const handleSelect = (font: string, target: 'font_heading' | 'font_body') => {
    loadGoogleFont(font);
    updateTheme({ [target]: font });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowFontPanel(false)}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Font Selector</h2>
          <button onClick={() => setShowFontPanel(false)} className="text-gray-400 hover:text-white">&#x2715;</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Heading Font</label>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button
                key={`h-${f.name}`}
                onClick={() => handleSelect(f.name, 'font_heading')}
                className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                  siteJson.theme.font_heading === f.name
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
                style={{ fontFamily: f.name }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Body Font</label>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button
                key={`b-${f.name}`}
                onClick={() => handleSelect(f.name, 'font_body')}
                className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                  siteJson.theme.font_body === f.name
                    ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
                style={{ fontFamily: f.name }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
          Current: {siteJson.theme.font_heading} + {siteJson.theme.font_body}
        </div>
      </div>
    </div>
  );
}
