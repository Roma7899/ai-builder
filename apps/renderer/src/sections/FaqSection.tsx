import { useState } from 'react';
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;

interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function FaqSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const items = (props.items as Array<{ question: string; answer: string }>) || [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
    : { className: 'py-16 px-4' };

  const displayItems = items.length > 0 ? items : [
    { question: 'How does it work?', answer: 'Simply sign up, describe your business, and our AI generates a complete website for you in minutes.' },
    { question: 'Can I customize the design?', answer: 'Yes! You can modify colors, fonts, layout, and content after generation.' },
    { question: 'Is hosting included?', answer: 'Yes, all sites come with free hosting on our platform. Custom domains are available on paid plans.' },
  ];

  return (
    <section {...attrs} style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-3xl mx-auto">
        {heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading)', color: '#111827' }}>
            {heading}
          </h2>
        )}
        <div className="space-y-4">
          {displayItems.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenIndex(openIndex === i ? null : i);
                }}
                className="w-full flex items-center justify-between p-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span>{item.question}</span>
                <svg
                  className={`w-5 h-5 shrink-0 ml-4 text-gray-400 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
