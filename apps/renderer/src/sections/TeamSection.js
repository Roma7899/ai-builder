import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function TeamSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const members = props.members || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#ffffff' }, children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-12", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-8", children: (members.length > 0 ? members : [
                        { name: 'Alex Rivera', role: 'CEO & Founder', bio: 'Visionary leader with 15 years of experience.' },
                        { name: 'Morgan Chen', role: 'CTO', bio: 'Full-stack engineer and AI enthusiast.' },
                        { name: 'Jordan Taylor', role: 'Design Lead', bio: 'Award-winning UX designer.' },
                        { name: 'Sam Patel', role: 'Marketing Director', bio: 'Growth strategist and brand builder.' },
                    ]).map((m, i) => (_jsxs("div", { className: "text-center group", children: [_jsx("div", { className: "w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold transition-transform group-hover:scale-110", style: { backgroundColor: 'var(--color-primary)' }, children: (m.name || '?')[0] }), _jsx("h3", { className: "font-semibold text-gray-900", children: m.name }), _jsx("p", { className: "text-sm", style: { color: 'var(--color-primary)' }, children: m.role }), m.bio && (_jsx("p", { className: "text-xs text-gray-400 mt-1 hidden group-hover:block transition-all", children: m.bio }))] }, i))) })] }) }));
}
