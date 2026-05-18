interface Props {
  colorPalette: string;
  fontPair: string;
  tone: string;
  onChange: <K extends string>(key: K, value: string) => void;
}

const PALETTES = [
  { id: 'modern-blue', label: 'Modern Blue', colors: ['#2563EB', '#1E40AF', '#DBEAFE', '#FFFFFF', '#1F2937'] },
  { id: 'forest-green', label: 'Forest Green', colors: ['#059669', '#047857', '#D1FAE5', '#FFFFFF', '#1F2937'] },
  { id: 'warm-amber', label: 'Warm Amber', colors: ['#D97706', '#B45309', '#FEF3C7', '#FFFFFF', '#1F2937'] },
  { id: 'elegant-purple', label: 'Elegant Purple', colors: ['#7C3AED', '#5B21B6', '#EDE9FE', '#FFFFFF', '#1F2937'] },
  { id: 'rose-pink', label: 'Rose Pink', colors: ['#E11D48', '#BE123C', '#FFE4E6', '#FFFFFF', '#1F2937'] },
  { id: 'slate-dark', label: 'Slate Dark', colors: ['#334155', '#1E293B', '#F1F5F9', '#FFFFFF', '#0F172A'] },
];

const FONT_PAIRS = [
  { id: 'inter', label: 'Inter + Inter', heading: 'Inter', body: 'Inter' },
  { id: 'playfair', label: 'Playfair + Inter', heading: 'Playfair Display', body: 'Inter' },
  { id: 'poppins', label: 'Poppins + Open Sans', heading: 'Poppins', body: 'Open Sans' },
  { id: 'merriweather', label: 'Merriweather + Source Sans', heading: 'Merriweather', body: 'Source Sans Pro' },
];

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Clean, corporate, and trust-focused' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm, approachable, and inviting' },
  { id: 'bold', label: 'Bold', desc: 'Modern, striking, and eye-catching' },
];

export default function StylePreferencesStep({
  colorPalette,
  fontPair,
  tone,
  onChange,
}: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Choose your style</h2>
      <p className="text-gray-500 mb-6">
        Pick a color palette, font combination, and tone for your website.
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Color Palette
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange('colorPalette', p.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  colorPalette === p.id
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {p.colors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Font Pairing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FONT_PAIRS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange('fontPair', f.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  fontPair === f.id
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">{f.heading}</p>
                <p className="text-sm text-gray-500">{f.body}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tone</h3>
          <div className="flex flex-wrap gap-3">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange('tone', t.id)}
                className={`px-5 py-3 rounded-xl border-2 text-left transition-all flex-1 min-w-[160px] ${
                  tone === t.id
                    ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
