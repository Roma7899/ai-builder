const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function FeaturesSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const subheading = (props.subheading as string) || '';
  const features = (props.features as Array<{ title: string; description: string; icon?: string }>) || [];

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
    : { className: 'py-16 px-4' };

  return (
    <section {...attrs} style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-6xl mx-auto">
        {heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: 'var(--font-heading)', color: '#111827' }}>
            {heading}
          </h2>
        )}
        {subheading && (
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">{subheading}</p>
        )}
        {features.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow bg-white">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-100">
                <div className="w-12 h-12 rounded-lg bg-gray-200 mb-4" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
