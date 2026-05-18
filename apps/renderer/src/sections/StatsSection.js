import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function StatsSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const stats = props.stats || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    const statItems = stats.length > 0 ? stats : [
        { value: '10K+', label: 'Customers' },
        { value: '99.9%', label: 'Uptime' },
        { value: '5M+', label: 'Sites Generated' },
        { value: '4.9', label: 'Average Rating' },
    ];
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#f9fafb' }, children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-12", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-8", children: statItems.map((stat, i) => (_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-4xl sm:text-5xl font-bold mb-1", style: { color: 'var(--color-primary)' }, children: stat.value }), _jsx("p", { className: "text-gray-500 text-sm", children: stat.label })] }, i))) })] }) }));
}
