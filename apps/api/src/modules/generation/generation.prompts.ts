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
    '  Props: { heading: string, subheading: string, cta_text: string, cta_link: string, background_image?: string, layout?: "centered" | "split" }',
    '  Purpose: Full-width above-the-fold banner — make the headline bold and benefit-driven',
    '',
    '--- features ---',
    '  Props: { heading: string, subheading?: string, features: Array<{ title: string, description: string, icon?: string }> }',
    '  Purpose: Grid of product/service features — each feature should solve a real customer pain point',
    '',
    '--- pricing ---',
    '  Props: { heading: string, plans: Array<{ name: string, price: string, period?: string, features: string[], cta: string, highlighted?: boolean }> }',
    '  Purpose: Tiered pricing table — include actual pricing with real feature lists (min 3 plans)',
    '',
    '--- testimonials ---',
    '  Props: { heading: string, testimonials: Array<{ name: string, role: string, company: string, quote: string, avatar?: string }> }',
    '  Purpose: Customer/social proof cards — quotes must sound like real people, not generic filler',
    '',
    '--- faq ---',
    '  Props: { heading: string, items: Array<{ question: string, answer: string }> }',
    '  Purpose: Accordion-style FAQ — answer real objections customers would have',
    '',
    '--- contact_form ---',
    '  Props: { heading: string, subheading?: string, name_placeholder?: string, email_placeholder?: string, button_text: string }',
    '  Purpose: Lead capture form',
    '',
    '--- gallery ---',
    '  Props: { heading: string, images: Array<{ src: string, alt: string, caption?: string }> }',
    '  Purpose: Image grid/masonry',
    '',
    '--- team ---',
    '  Props: { heading: string, members: Array<{ name: string, role: string, bio?: string, avatar?: string }> }',
    '  Purpose: Team member cards — give each member a realistic bio',
    '',
    '--- cta_banner ---',
    '  Props: { heading: string, subheading?: string, button_text: string, button_link: string, background_color?: string }',
    '  Purpose: Call-to-action band — compelling final push before footer',
    '',
    '--- stats ---',
    '  Props: { heading?: string, stats: Array<{ value: string, label: string }> }',
    '  Purpose: Numbers/achievement counters — use realistic metrics (e.g. "10K+ Customers" not "100 Happy Clients")',
    '',
    '--- logo_strip ---',
    '  Props: { heading?: string, logos: Array<{ src: string, alt: string, width?: number }> }',
    '  Purpose: Client/partner logo row — use well-known company names relevant to the industry',
    '',
    '--- footer ---',
    '  Props: { copyright: string, columns?: Array<{ title: string, links: Array<{ label: string, url: string }> }>, social?: Array<{ platform: string, url: string }> }',
    '  Purpose: Site footer with links, social icons, and copyright',
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
    'You are an elite web designer and professional copywriter. Your task is to generate a complete, production-quality website as JSON.',
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
    'CONTENT QUALITY GUIDELINES:',
    '- Write like a professional copywriter: benefit-driven headlines, persuasive subheadings, clear CTAs',
    '- NO placeholder text like "hello", "lorem ipsum", "welcome", "your company", "your business", or generic filler',
    '- Every piece of text must be specific, realistic, and tailored to the business being described',
    '- Testimonials should sound like real customer quotes with specific outcomes (e.g. "Increased our revenue by 40% in 3 months")',
    '- Feature descriptions should explain benefits, not just features (e.g. "Cloud sync so your team stays in sync across every device" not "Cloud sync")',
    '- Pricing should include realistic numbers with real feature comparisons across tiers',
    '- For stats, use credible numbers (e.g. "15,000+", "99.9% uptime", "4.9 stars")',
    '- For footer links, use standard pages: About, Services, Privacy Policy, Terms of Service, Contact',
    '',
    'DESIGN PRINCIPLES:',
    '- Use modern, clean design — think Stripe, Linear, Vercel level of quality',
    '- Choose a cohesive color palette: primary_color should be a vibrant modern hue (blues, indigos, emeralds, or warm oranges)',
    '- font_heading and font_body should be modern web fonts (Inter, Plus Jakarta Sans, DM Sans, Outfit, Manrope, Satoshi)',
    '- border_radius should be subtle (6px to 12px) for a modern feel',
    '- Use background_image on hero sparingly — only when it adds real value',
    '',
    'SECTION STRUCTURE RULES:',
    '- First section MUST have type "hero"',
    '- Last section MUST have type "footer"',
    '- Include 6 to 8 sections total (hero + 4-6 middle sections + footer)',
    '- Choose sections that make sense for the business type:',
    '  * SaaS/Tech: hero → features → stats → pricing → testimonials → cta_banner → faq → footer',
    '  * Agency/Service: hero → stats → features → team → testimonials → cta_banner → faq → footer',
    '  * Ecommerce/Retail: hero → features → gallery → testimonials → cta_banner → faq → footer',
    '  * Consulting: hero → stats → testimonials → features → team → cta_banner → footer',
    '  * Restaurant/Food: hero → features → gallery → testimonials → cta_banner → contact_form → footer',
    '  * Health/Fitness: hero → stats → features → testimonials → pricing → cta_banner → footer',
    '  * Education: hero → features → stats → team → testimonials → pricing → faq → footer',
    '  * Nonprofit: hero → stats → features → testimonials → gallery → cta_banner → footer',
    '  * Portfolio/Creative: hero → stats → gallery → testimonials → cta_banner → contact_form → footer',
    '- Each section.id must be unique (e.g. "hero-abc123", "features-def456")',
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
