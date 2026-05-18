const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function StatsSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const stats = (props.stats as Array<{ value: string; label: string }>) || [];

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
    : { className: 'py-16 px-4' };

  const statItems = stats.length > 0 ? stats : [
    { value: '10K+', label: 'Customers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '5M+', label: 'Sites Generated' },
    { value: '4.9', label: 'Average Rating' },
  ];

  return (
    <section {...attrs} style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-5xl mx-auto">
        {heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading)', color: '#111827' }}>
            {heading}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statItems.map((stat, i) => (
            <div key={i} className="text-center">
              <p
                className="text-4xl sm:text-5xl font-bold mb-1"
                style={{ color: 'var(--color-primary)' }}
              >
                {stat.value}
              </p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
