import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function FaqSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const items = props.items || [];
    const [openIndex, setOpenIndex] = useState(null);
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
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#f9fafb' }, children: _jsxs("div", { className: "max-w-3xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-12", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), _jsx("div", { className: "space-y-4", children: displayItems.map((item, i) => (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 overflow-hidden", children: [_jsxs("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    setOpenIndex(openIndex === i ? null : i);
                                }, className: "w-full flex items-center justify-between p-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors", children: [_jsx("span", { children: item.question }), _jsx("svg", { className: `w-5 h-5 shrink-0 ml-4 text-gray-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }), openIndex === i && (_jsx("div", { className: "px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4", children: item.answer }))] }, i))) })] }) }));
}
