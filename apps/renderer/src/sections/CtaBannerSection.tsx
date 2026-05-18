const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function CtaBannerSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || 'Ready to Get Started?';
  const subheading = (props.subheading as string) || '';
  const buttonText = (props.button_text as string) || 'Get Started';
  const buttonLink = (props.button_link as string) || '#';
  const bgColor = (props.background_color as string) || undefined;

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-20 px-4 cursor-pointer hover:ring-2 hover:ring-white transition-all' }
    : { className: 'py-20 px-4' };

  return (
    <section
      {...attrs}
      className={`py-20 px-4 text-white text-center ${isEditing ? 'cursor-pointer hover:ring-2 hover:ring-white transition-all' : ''}`}
      style={{
        backgroundColor: bgColor || 'var(--color-primary)',
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {heading}
        </h2>
        {subheading && (
          <p className="text-lg opacity-90 mb-8 text-white/80">{subheading}</p>
        )}
        <a
          href={buttonLink}
          className="inline-block px-8 py-3 bg-white font-semibold rounded-lg no-underline transition-transform hover:scale-105"
          style={{
            color: bgColor ? bgColor : 'var(--color-primary)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          {buttonText}
        </a>
      </div>
    </section>
  );
}
