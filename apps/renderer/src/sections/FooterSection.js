import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function FooterSection({ sectionId, props, isEditing }) {
    const copyright = props.copyright || `\u00A9 ${new Date().getFullYear()} All rights reserved.`;
    const columns = props.columns || [];
    const social = props.social || [];
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
    return (_jsx("footer", { ...attrs, children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("div", { className: "grid gap-8 mb-8", style: { gridTemplateColumns: `repeat(${Math.min(displayColumns.length, 4)}, minmax(0, 1fr))` }, children: displayColumns.map((col, i) => (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-white mb-4 text-sm uppercase tracking-wider", children: col.title }), _jsx("ul", { className: "space-y-2.5", children: col.links.map((link, li) => (_jsx("li", { children: _jsx("a", { href: link.url, className: "text-sm text-gray-400 hover:text-white transition-colors no-underline", children: link.label }) }, li))) })] }, i))) }), social.length > 0 && (_jsx("div", { className: "flex gap-6 justify-center mb-8 pt-8 border-t border-gray-800", children: social.map((s, i) => (_jsx("a", { href: s.url, className: "text-gray-400 hover:text-white transition-colors text-sm no-underline", children: s.platform }, i))) })), _jsx("div", { className: "text-center text-sm text-gray-500 pt-8 border-t border-gray-800", children: copyright })] }) }));
}
