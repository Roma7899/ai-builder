const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function LogoStripSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const logos = (props.logos as Array<{ src: string; alt: string; width?: number }>) || [];

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-12 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
    : { className: 'py-12 px-4' };

  return (
    <section {...attrs} style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-5xl mx-auto">
        {heading && (
          <p className="text-sm text-gray-400 text-center mb-8 uppercase tracking-widest font-medium">
            {heading}
          </p>
        )}
        <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-40">
          {(logos.length > 0 ? logos : [1, 2, 3, 4, 5]).map((logo, i) => (
            <div
              key={i}
              className="h-10 flex items-center justify-center"
              style={{ width: typeof logo === 'object' && logo.width ? logo.width : 100 }}
            >
              {typeof logo === 'object' && logo.src ? (
                <img
                  src={logo.src}
                  alt={logo.alt || 'Partner logo'}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="w-full h-8 bg-gray-100 rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
