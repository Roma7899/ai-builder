export type ParentMessageType = 'SITE_UPDATE' | 'SECTION_UPDATE' | 'THEME_UPDATE' | 'HIGHLIGHT_SECTION' | 'AUTH';

interface SiteMeta {
  title: unknown;
  description: unknown;
  language: unknown;
}

interface SiteTheme {
  primary_color: unknown;
  font_heading: unknown;
  font_body: unknown;
  border_radius: unknown;
}

interface SectionNode {
  id: unknown;
  type: unknown;
  order: unknown;
  visible: unknown;
  props: unknown;
}

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isHexColor(v: unknown): boolean {
  return typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
}

function isValidSectionType(v: unknown): boolean {
  const types = ['hero', 'features', 'pricing', 'testimonials', 'faq', 'contact_form', 'gallery', 'team', 'cta_banner', 'stats', 'logo_strip', 'footer'];
  return typeof v === 'string' && types.includes(v);
}

function validateSiteMeta(v: unknown): v is SiteMeta {
  return isRecord(v) && isString(v.title) && isString(v.description) && isString(v.language);
}

function validateSiteTheme(v: unknown): v is SiteTheme {
  return isRecord(v) && isHexColor(v.primary_color) && isString(v.font_heading) && isString(v.font_body) && isString(v.border_radius);
}

function validateSection(v: unknown): v is SectionNode {
  if (!isRecord(v)) return false;
  return isString(v.id) && isValidSectionType(v.type) && typeof v.order === 'number' && typeof v.visible === 'boolean' && isRecord(v.props);
}

export interface ValidatedMessage {
  type: ParentMessageType;
  payload: unknown;
}

export function validateParentMessage(data: unknown): ValidatedMessage | null {
  if (!isRecord(data)) return null;
  const { type, payload } = data;

  if (!isString(type)) return null;

  switch (type as ParentMessageType) {
    case 'SITE_UPDATE': {
      if (!isRecord(payload)) return null;
      const s = payload as Record<string, unknown>;
      if (!validateSiteMeta(s.meta)) return null;
      if (!validateSiteTheme(s.theme)) return null;
      if (!Array.isArray(s.sections) || !s.sections.every(validateSection)) return null;
      return { type: 'SITE_UPDATE', payload };
    }
    case 'SECTION_UPDATE': {
      if (!isRecord(payload)) return null;
      const u = payload as Record<string, unknown>;
      if (!isString(u.id)) return null;
      return { type: 'SECTION_UPDATE', payload };
    }
    case 'THEME_UPDATE': {
      if (!validateSiteTheme(payload)) return null;
      return { type: 'THEME_UPDATE', payload };
    }
    case 'HIGHLIGHT_SECTION': {
      if (!isRecord(payload)) return null;
      const h = payload as Record<string, unknown>;
      if (h.sectionId !== null && !isString(h.sectionId)) return null;
      return { type: 'HIGHLIGHT_SECTION', payload };
    }
    case 'AUTH': {
      if (!isRecord(payload)) return null;
      const a = payload as Record<string, unknown>;
      if (!isString(a.sessionToken)) return null;
      return { type: 'AUTH', payload };
    }
    default:
      return null;
  }
}
