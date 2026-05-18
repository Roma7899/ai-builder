import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function FeaturesSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const subheading = props.subheading || '';
    const features = props.features || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#ffffff' }, children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-4", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), subheading && (_jsx("p", { className: "text-gray-500 text-center max-w-2xl mx-auto mb-12", children: subheading })), features.length > 0 ? (_jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-8", children: features.map((f, i) => (_jsxs("div", { className: "p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow bg-white", children: [_jsx("div", { className: "w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4", style: { backgroundColor: 'var(--color-primary)' }, children: i + 1 }), _jsx("h3", { className: "text-lg font-semibold mb-2 text-gray-900", children: f.title }), _jsx("p", { className: "text-gray-500 text-sm leading-relaxed", children: f.description })] }, i))) })) : (_jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-8", children: [1, 2, 3].map((i) => (_jsxs("div", { className: "p-6 rounded-xl border border-gray-100", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-gray-200 mb-4" }), _jsx("div", { className: "h-5 bg-gray-200 rounded w-3/4 mb-2" }), _jsx("div", { className: "h-4 bg-gray-100 rounded w-full" })] }, i))) }))] }) }));
}
