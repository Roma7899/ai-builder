const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function GallerySection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const images = (props.images as Array<{ src: string; alt: string; caption?: string }>) || [];

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
    : { className: 'py-16 px-4' };

  const placeholders: Array<{ src: string; alt: string; caption?: string }> = Array.from({ length: 6 }, () => ({ src: '', alt: '' }));

  return (
    <section {...attrs} style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-6xl mx-auto">
        {heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading)', color: '#111827' }}>
            {heading}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(images.length > 0 ? images : placeholders).map((img, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center relative group"
              style={{ borderRadius: 'var(--border-radius)' }}
            >
              {'src' in img && img.src ? (
                <>
                  <img
                    src={img.src}
                    alt={(img as any).alt || ''}
                    className="w-full h-full object-cover"
                  />
                  {(img as any).caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm">{(img as any).caption}</p>
                    </div>
                  )}
                </>
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
