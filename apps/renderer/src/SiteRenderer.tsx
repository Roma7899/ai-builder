import type { SiteJSON, SectionNode } from './types/site.types';
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

const SECTION_MAP: Record<
  string,
  React.ComponentType<{ sectionId: string; props: Record<string, unknown>; isEditing?: boolean }>
> = {
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

interface Props {
  siteJson: SiteJSON;
  highlightedSectionId?: string;
  onSectionClick?: (sectionId: string) => void;
}

export default function SiteRenderer({ siteJson, highlightedSectionId, onSectionClick }: Props) {
  return (
    <main>
      {siteJson.sections
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order)
        .map((section: SectionNode) => {
          const Component = SECTION_MAP[section.type];
          if (!Component) return null;
          return (
            <Component
              key={section.id}
              sectionId={section.id}
              props={section.props}
              isEditing={section.id === highlightedSectionId}
            />
          );
        })}
    </main>
  );
}
