import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function LogoStripSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const logos = props.logos || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-12 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-12 px-4' };
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#ffffff' }, children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [heading && (_jsx("p", { className: "text-sm text-gray-400 text-center mb-8 uppercase tracking-widest font-medium", children: heading })), _jsx("div", { className: "flex flex-wrap justify-center items-center gap-12 grayscale opacity-40", children: (logos.length > 0 ? logos : [1, 2, 3, 4, 5]).map((logo, i) => (_jsx("div", { className: "h-10 flex items-center justify-center", style: { width: typeof logo === 'object' && logo.width ? logo.width : 100 }, children: typeof logo === 'object' && logo.src ? (_jsx("img", { src: logo.src, alt: logo.alt || 'Partner logo', className: "max-h-full max-w-full object-contain" })) : (_jsx("div", { className: "w-full h-8 bg-gray-100 rounded" })) }, i))) })] }) }));
}
