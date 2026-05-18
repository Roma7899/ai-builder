import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const EDITOR_ORIGIN = import.meta.env.VITE_EDITOR_ORIGIN;
export default function PricingSection({ sectionId, props, isEditing }) {
    const heading = props.heading || '';
    const plans = props.plans || [];
    const handleClick = () => {
        window.parent.postMessage({ type: 'SECTION_CLICK', payload: { sectionId } }, EDITOR_ORIGIN);
    };
    const attrs = isEditing
        ? { 'data-section-id': sectionId, onClick: handleClick, className: 'py-16 px-4 cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all' }
        : { className: 'py-16 px-4' };
    return (_jsx("section", { ...attrs, style: { backgroundColor: '#f9fafb' }, children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [heading && (_jsx("h2", { className: "text-3xl sm:text-4xl font-bold text-center mb-4", style: { fontFamily: 'var(--font-heading)', color: '#111827' }, children: heading })), _jsx("div", { className: "grid gap-8 max-w-5xl mx-auto", style: {
                        gridTemplateColumns: `repeat(${Math.min(plans.length || 1, 3)}, minmax(0, 1fr))`,
                    }, children: (plans.length ? plans : [{ name: 'Basic', price: '$9', features: ['Feature 1', 'Feature 2'], cta: 'Get Started' }]).map((plan, i) => (_jsxs("div", { className: `bg-white rounded-xl p-8 border text-center relative ${plan.highlighted ? 'scale-105 shadow-xl' : 'shadow-sm'}`, style: {
                            borderColor: plan.highlighted ? 'var(--color-primary)' : '#e5e7eb',
                        }, children: [plan.highlighted && (_jsx("span", { className: "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold text-white rounded-full", style: { backgroundColor: 'var(--color-primary)' }, children: "Popular" })), _jsx("h3", { className: "text-xl font-bold text-gray-900 mb-2", children: plan.name }), _jsxs("div", { className: "mb-6", children: [_jsx("span", { className: "text-4xl font-bold", style: { color: 'var(--color-primary)' }, children: plan.price }), plan.period && _jsxs("span", { className: "text-gray-400 text-sm ml-1", children: ["/", plan.period] })] }), plan.features?.length > 0 && (_jsx("ul", { className: "text-left space-y-3 mb-8", children: plan.features.map((f, fi) => (_jsxs("li", { className: "flex items-start gap-2 text-sm text-gray-600", children: [_jsx("span", { className: "mt-0.5 shrink-0", style: { color: 'var(--color-primary)' }, children: "\u2713" }), f] }, fi))) })), _jsx("a", { href: "#", className: "block w-full py-2.5 rounded-lg text-white font-semibold text-sm no-underline transition-opacity hover:opacity-90", style: {
                                    backgroundColor: plan.highlighted ? 'var(--color-primary)' : '#374151',
                                    borderRadius: 'var(--border-radius)',
                                }, children: plan.cta || 'Get Started' })] }, i))) })] }) }));
}
