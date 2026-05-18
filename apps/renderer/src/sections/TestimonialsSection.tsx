const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function TestimonialsSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const testimonials = (props.testimonials as Array<{
    name: string; role: string; company?: string; quote: string; avatar?: string;
  }>) || [];

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
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading)', color: '#111827' }}>
            {heading}
          </h2>
        )}
        {(testimonials.length > 0 ? testimonials : [
          { name: 'Jane Doe', role: 'CEO', company: 'Acme Inc', quote: 'Amazing service!' },
          { name: 'John Smith', role: 'Founder', company: 'Startup Co', quote: 'Transformed our business.' },
        ]).length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(testimonials.length ? testimonials : [
              { name: 'Jane Doe', role: 'CEO', company: 'Acme Inc', quote: 'This platform completely transformed how we work. The results have been incredible.' },
              { name: 'John Smith', role: 'Founder', company: 'Startup Co', quote: 'Outstanding quality and attention to detail. Highly recommended!' },
              { name: 'Sarah Johnson', role: 'Marketing Director', company: 'BrandX', quote: 'The best investment we have made for our online presence.' },
            ]).map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-600 italic mb-6 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {(t.name || '?')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {t.role}{t.company ? ` \u00B7 ${t.company}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
