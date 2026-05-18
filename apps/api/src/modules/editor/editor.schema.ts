import { z } from 'zod';

export const sectionTypeEnum = z.enum([
  'hero', 'features', 'pricing', 'testimonials', 'faq', 'contact_form',
  'gallery', 'team', 'cta_banner', 'stats', 'logo_strip', 'footer',
]);
