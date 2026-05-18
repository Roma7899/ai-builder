import type { StylePreferences } from './generation.schema';

const SCHEMA_TEMPLATE = {
  meta: {
    title: 'Site title',
    description: 'Site description',
    language: 'en',
  },
  theme: {
    primary_color: '#0066FF',
    font_heading: 'Inter',
    font_body: 'Inter',
    border_radius: '8px',
  },
  sections: [
    {
      id: 'section-unique-id',
      type: 'hero',
      order: 0,
      visible: true,
      props: {},
    },
  ],
};

function getSectionsCatalog(): string {
  return [
    '--- hero ---',
    '  Props: { heading: string, subheading: string, cta_text: string, cta_link: string, background_image?: string }',
    '  Purpose: Full-width above-the-fold banner',
    '',
    '--- features ---',
    '  Props: { heading: string, subheading?: string, features: Array<{ title: string, description: string, icon?: string }> }',
    '  Purpose: Grid of product/service features',
    '',
    '--- pricing ---',
    '  Props: { heading: string, plans: Array<{ name: string, price: string, period?: string, features: string[], cta: string, highlighted?: boolean }> }',
    '  Purpose: Tiered pricing table',
    '',
    '--- testimonials ---',
    '  Props: { heading: string, testimonials: Array<{ name: string, role: string, company: string, quote: string, avatar?: string }> }',
    '  Purpose: Customer/social proof cards',
    '',
    '--- faq ---',
    '  Props: { heading: string, items: Array<{ question: string, answer: string }> }',
    '  Purpose: Accordion-style FAQ',
    '',
    '--- contact_form ---',
    '  Props: { heading: string, subheading?: string, email_placeholder?: string, button_text: string }',
    '  Purpose: Lead capture form',
    '',
    '--- gallery ---',
    '  Props: { heading: string, images: Array<{ src: string, alt: string, caption?: string }> }',
    '  Purpose: Image grid/masonry',
    '',
    '--- team ---',
    '  Props: { heading: string, members: Array<{ name: string, role: string, bio?: string, avatar?: string }> }',
    '  Purpose: Team member cards',
    '',
    '--- cta_banner ---',
    '  Props: { heading: string, subheading?: string, button_text: string, button_link: string, background_color?: string }',
    '  Purpose: Call-to-action band',
    '',
    '--- stats ---',
    '  Props: { heading?: string, stats: Array<{ value: string, label: string }> }',
    '  Purpose: Numbers/achievement counters',
    '',
    '--- logo_strip ---',
    '  Props: { heading?: string, logos: Array<{ src: string, alt: string, width?: number }> }',
    '  Purpose: Client/partner logo row',
    '',
    '--- footer ---',
    '  Props: { copyright: string, columns?: Array<{ title: string, links: Array<{ label: string, url: string }> }>, social?: Array<{ platform: string, url: string }> }',
    '  Purpose: Site footer with links',
  ].join('\n');
}

function formatStylePreferences(prefs: StylePreferences): string {
  const lines: string[] = [];
  if (prefs.industryType) lines.push(`- Industry: ${prefs.industryType}`);
  if (prefs.colorPalette) lines.push(`- Color palette preference: ${prefs.colorPalette}`);
  if (prefs.fontPair) lines.push(`- Font pair preference: ${prefs.fontPair}`);
  return lines.join('\n');
}

export function buildSystemPrompt(stylePrefs?: StylePreferences): string {
  const catalog = getSectionsCatalog();
  const prefsBlock = stylePrefs ? formatStylePreferences(stylePrefs) : '';

  return [
    'You are an expert web designer and front-end developer. Generate a complete website as a JSON structure.',
    '',
    'Your response MUST be ONLY valid JSON — no markdown fences, no code blocks, no explanations, no extra whitespace.',
    '',
    'THE JSON MUST MATCH THIS EXACT STRUCTURE:',
    JSON.stringify(SCHEMA_TEMPLATE, null, 2),
    '',
    'AVAILABLE SECTION TYPES — USE THESE EXACT TYPES:',
    '',
    catalog,
    '',
    'RULES:',
    '- First section MUST have type "hero"',
    '- Last section MUST have type "footer"',
    '- Include 4 to 8 sections total (hero + middle sections + footer)',
    '- Each section.id must be unique (e.g. "hero-1", "features-2", "footer-3")',
    '- Props content must be realistic, specific, and relevant to the business',
    '- Choose section types that best represent the business being described',
    '- Set order sequentially starting from 0',
    '',
    prefsBlock ? `DESIGN PREFERENCES TO FOLLOW:\n${prefsBlock}\n` : '',
    'OUTPUT FORMAT:',
    'Return ONLY the raw JSON object. No markdown, no backticks, no commentary.',
    'The JSON must be parseable by JSON.parse().',
  ]
    .filter(Boolean)
    .join('\n');
}
