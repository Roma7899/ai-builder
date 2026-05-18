import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function TestimonialsSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const testimonials = props.testimonials || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#ffffff' }, children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-12", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), (testimonials.length > 0 ? testimonials : [
                    { name: 'Jane Doe', role: 'CEO', company: 'Acme Inc', quote: 'Amazing service!' },
                    { name: 'John Smith', role: 'Founder', company: 'Startup Co', quote: 'Transformed our business.' },
                ]).length > 0 && (_jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8", children: (testimonials.length ? testimonials : [
                        { name: 'Jane Doe', role: 'CEO', company: 'Acme Inc', quote: 'This platform completely transformed how we work. The results have been incredible.' },
                        { name: 'John Smith', role: 'Founder', company: 'Startup Co', quote: 'Outstanding quality and attention to detail. Highly recommended!' },
                        { name: 'Sarah Johnson', role: 'Marketing Director', company: 'BrandX', quote: 'The best investment we have made for our online presence.' },
                    ]).map((t, i) => (_jsxs("div", { className: "bg-gray-50 rounded-xl p-6 border border-gray-100", children: [_jsxs("p", { className: "text-gray-600 italic mb-6 leading-relaxed", children: ["\u201C", t.quote, "\u201D"] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0", style: { backgroundColor: 'var(--color-primary)' }, children: (t.name || '?')[0] }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-sm text-gray-900", children: t.name }), _jsxs("p", { className: "text-xs text-gray-400", children: [t.role, t.company ? ` \u00B7 ${t.company}` : ''] })] })] })] }, i))) }))] }) }));
}
