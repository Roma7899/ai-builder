import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function GallerySection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const images = props.images || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    const placeholders = [{}, {}, {}, {}, {}, {}];
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#f9fafb' }, children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-12", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: (images.length > 0 ? images : placeholders).map((img, i) => (_jsx("div", { className: "aspect-square rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center relative group", style: { borderRadius: 'var(--border-radius)' }, children: 'src' in img && img.src ? (_jsxs(_Fragment, { children: [_jsx("img", { src: img.src, alt: img.alt || '', className: "w-full h-full object-cover" }), img.caption && (_jsx("div", { className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("p", { className: "text-white text-sm", children: img.caption }) }))] })) : (_jsx("svg", { className: "w-12 h-12 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1, d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) })) }, i))) })] }) }));
}
