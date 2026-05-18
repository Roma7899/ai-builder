interface Props {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = [
  { id: 'restaurant', label: 'Restaurant', icon: '\uD83C\uDF7D\uFE0F', desc: 'Cafes, bistros, fast-casual, fine dining' },
  { id: 'salon', label: 'Salon & Spa', icon: '\u2728', desc: 'Hair salons, barbershops, nail studios, spas' },
  { id: 'agency', label: 'Agency', icon: '\uD83D\uDCD1', desc: 'Marketing, design, consulting, creative firms' },
  { id: 'startup', label: 'Startup', icon: '\uD83D\uDE80', desc: 'Tech startups, SaaS, mobile apps' },
  { id: 'portfolio', label: 'Portfolio', icon: '\uD83D\uDDBC\uFE0F', desc: 'Photographers, artists, freelancers' },
  { id: 'other', label: 'Other', icon: '\uD83D\uDCC1', desc: 'General business, non-profit, events' },
];

export default function BusinessTypeStep({ value, onChange }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">What type of business do you have?</h2>
      <p className="text-gray-500 mb-6">
        Choose the category that best describes your business. This helps us
        generate relevant content.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              value === opt.id
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl block mb-2">{opt.icon}</span>
            <h3 className="font-semibold text-gray-900">{opt.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{opt.desc}</p>
          </button>
        ))}
      </div>
      {!value && (
        <p className="text-sm text-gray-400 mt-4">Select a business type to continue</p>
      )}
    </div>
  );
}
