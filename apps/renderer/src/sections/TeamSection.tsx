const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function TeamSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const members = (props.members as Array<{ name: string; role: string; bio?: string; avatar?: string }>) || [];

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {(members.length > 0 ? members : [
            { name: 'Alex Rivera', role: 'CEO & Founder', bio: 'Visionary leader with 15 years of experience.' },
            { name: 'Morgan Chen', role: 'CTO', bio: 'Full-stack engineer and AI enthusiast.' },
            { name: 'Jordan Taylor', role: 'Design Lead', bio: 'Award-winning UX designer.' },
            { name: 'Sam Patel', role: 'Marketing Director', bio: 'Growth strategist and brand builder.' },
          ]).map((m, i) => (
            <div key={i} className="text-center group">
              <div
                className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold transition-transform group-hover:scale-110"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {(m.name || '?')[0]}
              </div>
              <h3 className="font-semibold text-gray-900">{m.name}</h3>
              <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                {m.role}
              </p>
              {m.bio && (
                <p className="text-xs text-gray-400 mt-1 hidden group-hover:block transition-all">
                  {m.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
