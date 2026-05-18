import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function ContactFormSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const subheading = props.subheading || '';
    const namePlaceholder = props.name_placeholder || 'Your Name';
    const emailPlaceholder = props.email_placeholder || 'you@example.com';
    const buttonText = props.button_text || 'Send Message';
    const [submitted, setSubmitted] = useState(false);
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#ffffff' }, children: _jsxs("div", { className: "max-w-xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-2", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), subheading && (_jsx("p", { className: "text-gray-500 text-center mb-8", children: subheading })), submitted ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", style: { backgroundColor: 'var(--color-primary-light)' }, children: _jsx("span", { className: "text-2xl", style: { color: 'var(--color-primary)' }, children: "\u2713" }) }), _jsx("p", { className: "text-lg font-semibold text-gray-900", children: "Thank you!" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "We will get back to you shortly." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { children: _jsx("input", { type: "text", placeholder: namePlaceholder, required: true, className: "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent", style: { borderRadius: 'var(--border-radius)' } }) }), _jsx("div", { children: _jsx("input", { type: "email", placeholder: emailPlaceholder, required: true, className: "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent", style: { borderRadius: 'var(--border-radius)' } }) }), _jsx("div", { children: _jsx("textarea", { rows: 4, placeholder: "Your Message", required: true, className: "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent", style: { borderRadius: 'var(--border-radius)' } }) }), _jsx("button", { type: "submit", className: "w-full py-2.5 text-white font-semibold rounded-lg text-sm transition-opacity hover:opacity-90", style: {
                                backgroundColor: 'var(--color-primary)',
                                borderRadius: 'var(--border-radius)',
                            }, children: buttonText })] }))] }) }));
}
