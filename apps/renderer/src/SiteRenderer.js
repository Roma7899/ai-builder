import { jsx as _jsx } from "react/jsx-runtime";
import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import PricingSection from './sections/PricingSection';
import TestimonialsSection from './sections/TestimonialsSection';
import FaqSection from './sections/FaqSection';
import ContactFormSection from './sections/ContactFormSection';
import GallerySection from './sections/GallerySection';
import TeamSection from './sections/TeamSection';
import CtaBannerSection from './sections/CtaBannerSection';
import StatsSection from './sections/StatsSection';
import LogoStripSection from './sections/LogoStripSection';
import FooterSection from './sections/FooterSection';
const SECTION_MAP = {
    hero: HeroSection,
    features: FeaturesSection,
    pricing: PricingSection,
    testimonials: TestimonialsSection,
    faq: FaqSection,
    contact_form: ContactFormSection,
    gallery: GallerySection,
    team: TeamSection,
    cta_banner: CtaBannerSection,
    stats: StatsSection,
    logo_strip: LogoStripSection,
    footer: FooterSection,
};
export default function SiteRenderer({ siteJson, highlightedSectionId, onSectionClick }) {
    return (_jsx("main", { children: siteJson.sections
            .filter((s) => s.visible)
            .sort((a, b) => a.order - b.order)
            .map((section) => {
            const Component = SECTION_MAP[section.type];
            if (!Component)
                return null;
            return (_jsx(Component, { sectionId: section.id, props: section.props, isEditing: section.id === highlightedSectionId }, section.id));
        }) }));
}
