import { z } from 'zod';

export const stylePreferencesSchema = z.object({
  colorPalette: z.string().optional(),
  fontPair: z.string().optional(),
  industryType: z.string().optional(),
});

export const generateRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  stylePreferences: stylePreferencesSchema.optional(),
});

export const siteMetaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  language: z.string().min(1),
});

export const siteThemeSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #FF0000)'),
  font_heading: z.string().min(1),
  font_body: z.string().min(1),
  border_radius: z.string().min(1),
});

const sectionTypeEnum = z.enum([
  'hero',
  'features',
  'pricing',
  'testimonials',
  'faq',
  'contact_form',
  'gallery',
  'team',
  'cta_banner',
  'stats',
  'logo_strip',
  'footer',
]);

export const sectionSchema = z.object({
  id: z.string().min(1),
  type: sectionTypeEnum,
  order: z.number().int().min(0),
  visible: z.boolean(),
  props: z.record(z.string(), z.unknown()),
});

export const siteJSONSchema = z.object({
  meta: siteMetaSchema,
  theme: siteThemeSchema,
  sections: z.array(sectionSchema).min(2).max(12),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type StylePreferences = z.infer<typeof stylePreferencesSchema>;
export type SiteJSON = z.infer<typeof siteJSONSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = z.infer<typeof sectionTypeEnum>;
