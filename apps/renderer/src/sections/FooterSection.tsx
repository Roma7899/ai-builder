const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function FooterSection({ sectionId, props, isEditing }: Props) {
  const copyright = (props.copyright as string) || `\u00A9 ${new Date().getFullYear()} All rights reserved.`;
  const columns = (props.columns as Array<{
    title: string;
    links: Array<{ label: string; url: string }>;
  }>) || [];
  const social = (props.social as Array<{ platform: string; url: string }>) || [];

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'bg-gray-900 text-gray-300 px-4 py-12 cursor-pointer hover:ring-2 hover:ring-white transition-all' }
    : { className: 'bg-gray-900 text-gray-300 px-4 py-12' };

  const defaultColumns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', url: '#' },
        { label: 'Pricing', url: '#' },
        { label: 'FAQ', url: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', url: '#' },
        { label: 'Blog', url: '#' },
        { label: 'Contact', url: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', url: '#' },
        { label: 'Terms', url: '#' },
      ],
    },
  ];

  const displayColumns = columns.length > 0 ? columns : defaultColumns;

  return (
    <footer {...attrs}>
      <div className="max-w-6xl mx-auto">
        <div
          className="grid gap-8 mb-8"
          style={{ gridTemplateColumns: `repeat(${Math.min(displayColumns.length, 4)}, minmax(0, 1fr))` }}
        >
          {displayColumns.map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, li) => (
                  <li key={li}>
                    <a
                      href={link.url}
                      className="text-sm text-gray-400 hover:text-white transition-colors no-underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {social.length > 0 && (
          <div className="flex gap-6 justify-center mb-8 pt-8 border-t border-gray-800">
            {social.map((s, i) => (
              <a
                key={i}
                href={s.url}
                className="text-gray-400 hover:text-white transition-colors text-sm no-underline"
              >
                {s.platform}
              </a>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-800">
          {copyright}
        </div>
      </div>
    </footer>
  );
}
