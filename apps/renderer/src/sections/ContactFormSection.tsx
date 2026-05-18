import { useState } from 'react';
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;

interface Props {
  sectionId: string;
  props: Record<string, unknown>;
  isEditing?: boolean;
}

export default function ContactFormSection({ sectionId, props, isEditing }: Props) {
  const heading = (props.heading as string) || '';
  const subheading = (props.subheading as string) || '';
  const namePlaceholder = (props.name_placeholder as string) || 'Your Name';
  const emailPlaceholder = (props.email_placeholder as string) || 'you@example.com';
  const buttonText = (props.button_text as string) || 'Send Message';

  const [submitted, setSubmitted] = useState(false);

  const handleClick = () => {
    window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const attrs = isEditing
    ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
    : { className: 'py-16 px-4' };

  return (
    <section {...attrs} style={{ backgroundColor: '#ffffff' }}>
      <div className="max-w-xl mx-auto">
        {heading && (
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2" style={{ fontFamily: 'var(--font-heading)', color: '#111827' }}>
            {heading}
          </h2>
        )}
        {subheading && (
          <p className="text-gray-500 text-center mb-8">{subheading}</p>
        )}
        {submitted ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--color-primary-light)' }}>
              <span className="text-2xl" style={{ color: 'var(--color-primary)' }}>&#10003;</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">Thank you!</p>
            <p className="text-gray-500 text-sm mt-1">We will get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <input
                type="text"
                placeholder={namePlaceholder}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                style={{ borderRadius: 'var(--border-radius)' }}
              />
            </div>
            <div>
              <input
                type="email"
                placeholder={emailPlaceholder}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                style={{ borderRadius: 'var(--border-radius)' }}
              />
            </div>
            <div>
              <textarea
                rows={4}
                placeholder="Your Message"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                style={{ borderRadius: 'var(--border-radius)' }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-primary)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {buttonText}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
