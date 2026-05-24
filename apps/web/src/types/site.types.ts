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

export interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  siteJson: SiteJSON;
}

export interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgTimeOnPage: number;
  dailyViews: { date: string; views: number }[];
  pages: { path: string; views: number }[];
}

export interface DomainInfo {
  domain: string;
  verified: boolean;
  verifiedAt: string | null;
}
