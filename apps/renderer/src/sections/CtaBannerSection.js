import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function CtaBannerSection({ sectionId, props, isEditing }) {
    const heading = props.heading || 'Ready to Get Started?';
    const subheading = props.subheading || '';
    const buttonText = props.button_text || 'Get Started';
    const buttonLink = props.button_link || '#';
    const bgColor = props.background_color || undefined;
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-20 px-4 cursor-pointer hover:ring-2 hover:ring-white transition-all' }
        : { className: 'py-20 px-4' };
    return (_jsx("section", { ...attrs, className: `py-20 px-4 text-white text-center ${isEditing ? 'cursor-pointer hover:ring-2 hover:ring-white transition-all' : ''}`, style: {
            backgroundColor: bgColor || 'var(--color-primary)',
        }, children: _jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsx("h2", { className: "text-3xl sm:text-4xl font-bold mb-4", style: { fontFamily: 'var(--font-heading)' }, children: heading }), subheading && (_jsx("p", { className: "text-lg opacity-90 mb-8 text-white/80", children: subheading })), _jsx("a", { href: buttonLink, className: "inline-block px-8 py-3 bg-white font-semibold rounded-lg no-underline transition-transform hover:scale-105", style: {
                        color: bgColor ? bgColor : 'var(--color-primary)',
                        borderRadius: 'var(--border-radius)',
                    }, children: buttonText })] }) }));
}
