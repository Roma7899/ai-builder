export interface SiteMeta {
  title: string;
  description: string;
  language: string;
}

export interface SiteTheme {
  primary_color: string;
  font_heading: string;
  font_body: string;
  border_radius: string;
}

export type SectionType =
  | 'hero'
  | 'features'
  | 'pricing'
  | 'testimonials'
  | 'faq'
  | 'contact_form'
  | 'gallery'
  | 'team'
  | 'cta_banner'
  | 'stats'
  | 'logo_strip'
  | 'footer';

export interface SectionNode {
  id: string;
  type: SectionType;
  order: number;
  visible: boolean;
  props: Record<string, unknown>;
}

export interface SiteJSON {
  meta: SiteMeta;
  theme: SiteTheme;
  sections: SectionNode[];
}

export interface ParentMessage {
  type: 'SITE_UPDATE' | 'SECTION_UPDATE' | 'THEME_UPDATE' | 'HIGHLIGHT_SECTION' | 'AUTH';
  payload: unknown;
}

export interface IFrameMessage {
  type: 'RENDERER_READY' | 'SECTION_CLICK';
  payload?: unknown;
}
