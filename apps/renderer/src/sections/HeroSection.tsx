const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function HeroSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || 'Welcome to Our Website';
  const subheading = (props.subheading as string) || '';
  const ctaText = (props.cta_text as string) || 'Get Started';
  const ctaLink = (props.cta_link as string) || '#';
  const bgImage = props.background_image as string | undefined;
  const layout = (props.layout as string) || 'centered';

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const editingAttrs = isEditing
    ? {
        'data-section-id': sectionId,
        onClick: handleClick,
        className:
          'relative overflow-hidden py-20 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all',
      }
    : {
        className: 'relative overflow-hidden py-20 px-4',
      };

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const }
    : { backgroundColor: '#f9fafb' };

  return (
    <section {...editingAttrs} style={bgStyle}>
      {bgImage && <div className="absolute inset-0 bg-black/40" />}
      <div className="max-w-6xl mx-auto relative z-10">
        <div
          className={`flex flex-col ${
            layout === 'split' ? 'lg:flex-row lg:items-center lg:gap-12' : 'items-center text-center'
          }`}
        >
          <div className={layout === 'split' ? 'lg:w-1/2' : 'max-w-3xl'}>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: 'var(--font-heading)', color: bgImage ? '#fff' : '#111827' }}
            >
              {heading}
            </h1>
            {subheading && (
              <p
                className={`text-lg sm:text-xl mb-8 max-w-2xl ${bgImage ? 'text-gray-200' : 'text-gray-600'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {subheading}
              </p>
            )}
            <a
              href={ctaLink}
              className="inline-block px-8 py-3 text-white font-semibold text-lg transition-transform hover:scale-105 no-underline"
              style={{
                backgroundColor: 'var(--color-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {ctaText}
            </a>
          </div>
          {layout === 'split' && (
            <div className="lg:w-1/2 mt-8 lg:mt-0">
              <div className="bg-gray-200/80 rounded-xl aspect-[4/3] flex items-center justify-center text-gray-500 text-lg">
                {bgImage ? (
                  <img src={bgImage} alt="Hero" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
