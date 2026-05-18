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

export interface SectionNode {
  id: string;
  type: string;
  order: number;
  visible: boolean;
  props: Record<string, unknown>;
}

export interface SiteJSON {
  meta: SiteMeta;
  theme: SiteTheme;
  sections: SectionNode[];
}

function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (!trimmed) return '#';

  const lowered = trimmed.toLowerCase();

  if (
    lowered.startsWith('https://') ||
    lowered.startsWith('http://') ||
    lowered.startsWith('mailto:')
  ) {
    return trimmed;
  }

  if (lowered.startsWith('//')) {
    return '#';
  }

  if (
    lowered.startsWith('/') ||
    lowered.startsWith('./') ||
    lowered.startsWith('../')
  ) {
    return trimmed;
  }

  if (!lowered.includes(':')) {
    return trimmed;
  }

  return '#';
}

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function buildThemeCSS(theme: SiteTheme): string {
  const primary = theme.primary_color || '#2563EB';
  return `
:root {
  --color-primary: ${primary};
  --color-primary-dark: ${adjustColor(primary, -20)};
  --color-primary-light: ${adjustColor(primary, 40)};
  --color-primary-rgb: ${parseInt(primary.slice(1, 3), 16)}, ${parseInt(primary.slice(3, 5), 16)}, ${parseInt(primary.slice(5, 7), 16)};
  --font-heading: '${esc(theme.font_heading || 'Inter')}', sans-serif;
  --font-body: '${esc(theme.font_body || 'Inter')}', sans-serif;
  --border-radius: ${esc(theme.border_radius || '8px')};
}`;
}

export function buildBaseCSS(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;scroll-behavior:smooth}
body{font-family:var(--font-body);color:#1f2937;background:#fff;-webkit-font-smoothing:antialiased;line-height:1.6}
h1,h2,h3,h4,h5,h6{font-family:var(--font-heading);color:#111827;line-height:1.2;font-weight:700}
h1{font-size:clamp(2rem,5vw,3.5rem)}h2{font-size:clamp(1.5rem,4vw,2.5rem)}h3{font-size:1.25rem}
a{color:inherit;text-decoration:none}
img{max-width:100%;height:auto;display:block}
ul,ol{list-style:none}
input,textarea,select,button{font:inherit}
.container{max-width:1200px;margin:0 auto;padding:0 1rem}
.btn{display:inline-block;padding:0.75rem 2rem;font-weight:600;border-radius:var(--border-radius);transition:all .2s;cursor:pointer;border:none;font-size:1rem}
.btn-primary{background:var(--color-primary);color:#fff}
.btn-primary:hover{opacity:.9;transform:scale(1.02)}
.section{padding:4rem 1rem}
.section-heading{font-size:clamp(1.5rem,4vw,2.5rem);font-weight:700;text-align:center;margin-bottom:0.5rem;color:#111827;font-family:var(--font-heading)}
.section-subheading{text-align:center;color:#6b7280;margin-bottom:3rem;max-width:600px;margin-left:auto;margin-right:auto;font-size:1.1rem}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem}
.grid-4{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem;transition:box-shadow .2s}
.card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
.text-center{text-align:center}
.flex-center{display:flex;align-items:center;justify-content:center}
.grayscale{filter:grayscale(1);opacity:.4}
.bg-gray{background:#f9fafb}
.bg-white{background:#fff}
.rounded-xl{border-radius:12px}
` + buildSectionCSS();
}

function buildSectionCSS(): string {
  return `
.hero-section{min-height:60vh;display:flex;align-items:center;position:relative}
.hero-content{max-width:720px}
.hero-heading{font-size:clamp(2rem,5vw,3.5rem);font-weight:700;line-height:1.1;margin-bottom:1.5rem}
.hero-subheading{font-size:1.25rem;color:#6b7280;margin-bottom:2rem;line-height:1.6}
.hero-split{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
.hero-image{aspect-ratio:4/3;background:#e5e7eb;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:3rem}

.feature-card{text-align:center;padding:2rem;background:#fff;border:1px solid #e5e7eb;border-radius:12px}
.feature-icon{width:48px;height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.25rem;margin:0 auto 1rem}
.feature-title{font-size:1.125rem;font-weight:600;margin-bottom:0.5rem}

.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;max-width:1000px;margin:0 auto}
.pricing-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:2rem;text-align:center;position:relative}
.pricing-card.highlighted{border-color:var(--color-primary);box-shadow:0 8px 24px rgba(var(--color-primary-rgb),.15);transform:scale(1.05)}
.pricing-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--color-primary);color:#fff;font-size:.75rem;padding:.25rem .75rem;border-radius:999px;font-weight:600}
.pricing-name{font-size:1.25rem;font-weight:700;margin-bottom:.5rem}
.pricing-price{font-size:2.5rem;font-weight:700;color:var(--color-primary);margin-bottom:1.5rem}
.pricing-period{font-size:.875rem;color:#9ca3af}
.pricing-features{text-align:left;margin-bottom:2rem;display:flex;flex-direction:column;gap:.75rem}
.pricing-feature{display:flex;align-items:center;gap:.5rem;font-size:.875rem;color:#6b7280}
.pricing-feature::before{content:"\\2713";color:var(--color-primary);font-weight:700}
.pricing-cta{display:block;width:100%;padding:.75rem;border-radius:var(--border-radius);font-weight:600;border:none;cursor:pointer;font-size:.875rem;color:#fff;background:#374151;transition:opacity .2s}
.pricing-cta.highlighted{background:var(--color-primary)}
.pricing-cta:hover{opacity:.9}

.testimonial-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem}
.testimonial-quote{color:#6b7280;font-style:italic;margin-bottom:1.5rem;line-height:1.6}
.testimonial-author{display:flex;align-items:center;gap:.75rem}
.testimonial-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.875rem}
.testimonial-name{font-weight:600;font-size:.875rem}
.testimonial-role{font-size:.75rem;color:#9ca3af}

.faq-item{background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:1rem;overflow:hidden}
.faq-question{padding:1.25rem;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:none;border:none;width:100%;text-align:left;font-size:1rem}
.faq-question:hover{background:#f9fafb}
.faq-answer{padding:0 1.25rem 1.25rem;color:#6b7280;font-size:.875rem;line-height:1.6}

.form-group{margin-bottom:1rem}
.form-input{width:100%;padding:.75rem 1rem;border:1px solid #d1d5db;border-radius:var(--border-radius);font-size:.875rem;transition:border-color .2s}
.form-input:focus{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px rgba(var(--color-primary-rgb),.15)}
.form-textarea{width:100%;padding:.75rem 1rem;border:1px solid #d1d5db;border-radius:var(--border-radius);font-size:.875rem;resize:vertical;min-height:100px}
.form-textarea:focus{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px rgba(var(--color-primary-rgb),.15)}
.form-btn{width:100%;padding:.75rem;background:var(--color-primary);color:#fff;border:none;border-radius:var(--border-radius);font-weight:600;cursor:pointer;font-size:.875rem}
.form-btn:hover{opacity:.9}

.cta-section{padding:5rem 1rem;text-align:center;color:#fff}
.cta-heading{font-size:clamp(1.5rem,4vw,2.5rem);font-weight:700;margin-bottom:1rem}
.cta-subheading{font-size:1.125rem;opacity:.9;margin-bottom:2rem}
.cta-btn{display:inline-block;padding:.75rem 2rem;background:#fff;color:var(--color-primary);font-weight:600;border-radius:var(--border-radius);transition:transform .2s}
.cta-btn:hover{transform:scale(1.05)}

.stat-card{text-align:center}
.stat-value{font-size:clamp(2rem,4vw,3rem);font-weight:700;color:var(--color-primary)}
.stat-label{color:#6b7280;font-size:.875rem;margin-top:.25rem}

.team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;max-width:900px;margin:0 auto}
.team-card{text-align:center}
.team-avatar{width:80px;height:80px;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:2rem}
.team-name{font-weight:600;margin-bottom:.25rem}
.team-role{font-size:.875rem;color:var(--color-primary)}

.gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}
.gallery-item{aspect-ratio:1;background:#e5e7eb;border-radius:12px;overflow:hidden}
.gallery-item img{width:100%;height:100%;object-fit:cover}

.logo-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:3rem;filter:grayscale(1);opacity:.4}
.logo-placeholder{width:120px;height:48px;background:#e5e7eb;border-radius:4px}

.footer{background:#111827;color:#9ca3af;padding:3rem 1rem}
.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:2rem;max-width:1200px;margin:0 auto;margin-bottom:2rem}
.footer-column h4{color:#fff;font-weight:600;margin-bottom:1rem;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em}
.footer-column li{margin-bottom:.5rem}
.footer-column a{font-size:.875rem;color:#9ca3af;transition:color .2s}
.footer-column a:hover{color:#fff}
.footer-social{display:flex;justify-content:center;gap:1.5rem;padding:1.5rem 0;border-top:1px solid #1f2937;margin-bottom:1.5rem}
.footer-social a{color:#9ca3af;font-size:.875rem;transition:color .2s}
.footer-social a:hover{color:#fff}
.footer-bottom{text-align:center;font-size:.875rem;padding-top:1.5rem;border-top:1px solid #1f2937;color:#6b7280}
`;
}

function renderHero(p: Record<string, unknown>): string {
  const heading = esc(p.heading || 'Welcome');
  const subheading = esc(p.subheading || '');
  const ctaText = esc(p.cta_text || 'Get Started');
  const ctaLink = esc(sanitizeUrl(String(p.cta_link || '#')));
  const bgImage = p.background_image ? esc(sanitizeUrl(String(p.background_image))) : '';
  const layout = String(p.layout || 'centered');

  const bgStyle = bgImage
    ? `style="background:url(${bgImage}) center/cover;position:relative"`
    : 'style="background:#f9fafb"';
  const overlay = bgImage ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.4)"></div>' : '';
  const textColor = bgImage ? 'style="color:#fff"' : '';
  const subColor = bgImage ? 'style="color:rgba(255,255,255,.8)"' : '';

  if (layout === 'split') {
    return `<section class="hero-section section" ${bgStyle}>
      ${overlay}
      <div class="container" style="position:relative;z-index:1;width:100%">
        <div class="hero-split">
          <div>
            <h1 class="hero-heading" ${textColor}>${heading}</h1>
            ${subheading ? `<p class="hero-subheading" ${subColor}>${subheading}</p>` : ''}
            <a href="${ctaLink}" class="btn btn-primary">${ctaText}</a>
          </div>
          <div class="hero-image">${bgImage ? `<img src="${esc(sanitizeUrl(String(p.background_image)))}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : 'Image'}</div>
        </div>
      </div>
    </section>`;
  }

  return `<section class="hero-section section" ${bgStyle}>
    ${overlay}
    <div class="container" style="position:relative;z-index:1;text-align:center">
      <div style="max-width:720px;margin:0 auto">
        <h1 class="hero-heading" ${textColor}>${heading}</h1>
        ${subheading ? `<p class="hero-subheading" ${subColor}>${subheading}</p>` : ''}
        <a href="${ctaLink}" class="btn btn-primary">${ctaText}</a>
      </div>
    </div>
  </section>`;
}

function renderFeatures(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const subheading = esc(p.subheading || '');
  const features = (p.features || []) as Array<{ title?: string; description?: string; icon?: string }>;
  const items = features.length ? features : [{ title: 'Feature One', description: 'Description of your feature' }, { title: 'Feature Two', description: 'Another great feature' }, { title: 'Feature Three', description: 'Yet another amazing feature' }];

  return `<section class="section bg-white">
    <div class="container">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      ${subheading ? `<p class="section-subheading">${subheading}</p>` : ''}
      <div class="grid-3">
        ${items.map((f, i) => `<article class="feature-card">
          <div class="feature-icon" style="background:var(--color-primary)">${i + 1}</div>
          <h3 class="feature-title">${esc(f.title || '')}</h3>
          <p style="color:#6b7280;font-size:.875rem;line-height:1.6">${esc(f.description || '')}</p>
        </article>`).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderPricing(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const plans = (p.plans || []) as Array<{ name?: string; price?: string; period?: string; features?: string[]; cta?: string; highlighted?: boolean }>;
  const items = plans.length ? plans : [{ name: 'Basic', price: '$9', period: 'month', features: ['Feature 1', 'Feature 2'], cta: 'Get Started' }];

  return `<section class="section bg-gray">
    <div class="container">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      <div class="pricing-grid">
        ${items.map((plan) => `<div class="pricing-card${plan.highlighted ? ' highlighted' : ''}">
          ${plan.highlighted ? '<div class="pricing-badge">Popular</div>' : ''}
          <h3 class="pricing-name">${esc(plan.name || '')}</h3>
          <div class="pricing-price">${esc(plan.price || '')}${plan.period ? `<span class="pricing-period">/${esc(plan.period)}</span>` : ''}</div>
          ${plan.features?.length ? `<div class="pricing-features">${plan.features.map((f) => `<span class="pricing-feature">${esc(f)}</span>`).join('')}</div>` : ''}
          <button class="pricing-cta${plan.highlighted ? ' highlighted' : ''}">${esc(plan.cta || 'Get Started')}</button>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderTestimonials(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const testimonials = (p.testimonials || []) as Array<{ name?: string; role?: string; company?: string; quote?: string }>;
  const items = testimonials.length ? testimonials : [{ name: 'Jane Doe', role: 'CEO', quote: 'Amazing service!' }];

  return `<section class="section bg-white">
    <div class="container">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      <div class="grid-3">
        ${items.map((t) => `<div class="testimonial-card">
          <p class="testimonial-quote">&ldquo;${esc(t.quote || '')}&rdquo;</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar" style="background:var(--color-primary)">${(t.name || '?')[0]}</div>
            <div><div class="testimonial-name">${esc(t.name || '')}</div><div class="testimonial-role">${esc(t.role || '')}${t.company ? ` \u00B7 ${esc(t.company)}` : ''}</div></div>
          </div>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderFaq(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const items = (p.items || []) as Array<{ question?: string; answer?: string }>;
  const faqItems = items.length ? items : [{ question: 'How does it work?', answer: 'Sign up and describe your business.' }];

  return `<section class="section bg-gray">
    <div class="container" style="max-width:720px">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      ${faqItems.map((item) => `<details class="faq-item">
        <summary class="faq-question">${esc(item.question || '')}</summary>
        <div class="faq-answer">${esc(item.answer || '')}</div>
      </details>`).join('\n')}
    </div>
  </section>`;
}

function renderContactForm(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const subheading = esc(p.subheading || '');
  const namePl = esc(p.name_placeholder || 'Your Name');
  const emailPl = esc(p.email_placeholder || 'your@email.com');
  const btnText = esc(p.button_text || 'Send Message');

  return `<section class="section bg-white">
    <div class="container" style="max-width:480px">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      ${subheading ? `<p class="section-subheading">${subheading}</p>` : ''}
      <form onsubmit="event.preventDefault()">
        <div class="form-group"><input type="text" class="form-input" placeholder="${namePl}" required></div>
        <div class="form-group"><input type="email" class="form-input" placeholder="${emailPl}" required></div>
        <div class="form-group"><textarea class="form-textarea" placeholder="Your Message" required></textarea></div>
        <button type="submit" class="form-btn">${btnText}</button>
      </form>
    </div>
  </section>`;
}

function renderGallery(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const images = (p.images || []) as Array<{ src?: string; alt?: string }>;
  const items = images.length ? images : [{}, {}, {}, {}, {}, {}];

  return `<section class="section bg-gray">
    <div class="container">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      <div class="gallery-grid">
        ${items.map((img) => `<div class="gallery-item">${img.src ? `<img src="${esc(sanitizeUrl(img.src))}" alt="${esc(img.alt || '')}">` : '<div class="flex-center" style="height:100%;color:#9ca3af">Image</div>'}</div>`).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderTeam(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const members = (p.members || []) as Array<{ name?: string; role?: string; bio?: string }>;
  const items = members.length ? members : [{ name: 'Alex Rivera', role: 'CEO' }];

  return `<section class="section bg-white">
    <div class="container">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      <div class="team-grid">
        ${items.map((m) => `<div class="team-card">
          <div class="team-avatar" style="background:var(--color-primary)">${(m.name || '?')[0]}</div>
          <h3 class="team-name">${esc(m.name || '')}</h3>
          <p class="team-role">${esc(m.role || '')}</p>
          ${m.bio ? `<p style="font-size:.75rem;color:#9ca3af;margin-top:.25rem">${esc(m.bio)}</p>` : ''}
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderCtaBanner(p: Record<string, unknown>): string {
  const heading = esc(p.heading || 'Ready to Get Started?');
  const subheading = esc(p.subheading || '');
  const btnText = esc(p.button_text || 'Get Started');
  const btnLink = esc(sanitizeUrl(String(p.button_link || '#')));
  const bgColor = p.background_color ? esc(String(p.background_color)) : 'var(--color-primary)';

  return `<section class="cta-section" style="background:${bgColor}">
    <div class="container">
      <h2 class="cta-heading">${heading}</h2>
      ${subheading ? `<p class="cta-subheading">${subheading}</p>` : ''}
      <a href="${btnLink}" class="cta-btn">${btnText}</a>
    </div>
  </section>`;
}

function renderStats(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const stats = (p.stats || []) as Array<{ value?: string; label?: string }>;
  const items = stats.length ? stats : [{ value: '10K+', label: 'Customers' }, { value: '99.9%', label: 'Uptime' }];

  return `<section class="section bg-gray">
    <div class="container">
      ${heading ? `<h2 class="section-heading">${heading}</h2>` : ''}
      <div class="grid-4">
        ${items.map((s) => `<div class="stat-card">
          <div class="stat-value">${esc(s.value || '')}</div>
          <div class="stat-label">${esc(s.label || '')}</div>
        </div>`).join('\n')}
      </div>
    </div>
  </section>`;
}

function renderLogoStrip(p: Record<string, unknown>): string {
  const heading = esc(p.heading || '');
  const logos = (p.logos || []) as Array<{ src?: string; alt?: string; width?: number }>;

  return `<section class="section bg-white">
    <div class="container">
      ${heading ? `<p style="text-align:center;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-size:.875rem;margin-bottom:2rem">${heading}</p>` : ''}
      <div class="logo-row">
        ${logos.length ? logos.map((logo) => `<div>${logo.src ? `<img src="${esc(sanitizeUrl(logo.src))}" alt="${esc(logo.alt || 'logo')}" style="max-height:48px">` : '<div class="logo-placeholder"></div>'}</div>`).join('\n') : [1,2,3,4].map(() => '<div class="logo-placeholder"></div>').join('\n')}
      </div>
    </div>
  </section>`;
}

function renderFooter(p: Record<string, unknown>): string {
  const copyright = esc(p.copyright || `\u00A9 ${new Date().getFullYear()} All rights reserved.`);
  const columns = (p.columns || []) as Array<{ title?: string; links?: Array<{ label?: string; url?: string }> }>;
  const social = (p.social || []) as Array<{ platform?: string; url?: string }>;
  const cols = columns.length ? columns : [{ title: 'Product', links: [{ label: 'Features', url: '#' }, { label: 'Pricing', url: '#' }] }, { title: 'Company', links: [{ label: 'About', url: '#' }] }];

  return `<footer class="footer">
    <div class="footer-grid">
      ${cols.map((col) => `<div class="footer-column">
        <h4>${esc(col.title || '')}</h4>
        <ul>${(col.links || []).map((link) => `<li><a href="${esc(sanitizeUrl(link.url || '#'))}">${esc(link.label || '')}</a></li>`).join('')}</ul>
      </div>`).join('\n')}
    </div>
    ${social.length ? `<div class="footer-social">${social.map((s) => `<a href="${esc(sanitizeUrl(s.url || '#'))}">${esc(s.platform || 'Social')}</a>`).join('\n')}</div>` : ''}
    <div class="footer-bottom">${copyright}</div>
  </footer>`;
}

const SECTION_RENDERERS: Record<string, (p: Record<string, unknown>) => string> = {
  hero: renderHero,
  features: renderFeatures,
  pricing: renderPricing,
  testimonials: renderTestimonials,
  faq: renderFaq,
  contact_form: renderContactForm,
  gallery: renderGallery,
  team: renderTeam,
  cta_banner: renderCtaBanner,
  stats: renderStats,
  logo_strip: renderLogoStrip,
  footer: renderFooter,
};

export function renderSection(section: SectionNode): string {
  const renderer = SECTION_RENDERERS[section.type];
  if (!renderer) return `<section class="section"><div class="container"><p style="color:#9ca3af;text-align:center">${esc(section.type)} section</p></div></section>`;
  return renderer(section.props);
}

export function renderFullHTML(siteJson: SiteJSON): string {
  const theme = siteJson.theme;
  const meta = siteJson.meta;

  const fontH = (theme.font_heading || 'Inter').replace(/ /g, '+');
  const fontB = (theme.font_body || 'Inter').replace(/ /g, '+');
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontH}:wght@400;600;700&family=${fontB}:wght@400;500;600&display=swap`;

  const sectionsHtml = (siteJson.sections || [])
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order)
    .map((s) => renderSection(s))
    .join('\n');

  const themeCss = buildThemeCSS(theme);
  const baseCss = buildBaseCSS();

  return `<!DOCTYPE html>
<html lang="${esc(meta?.language || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(meta?.title || '')}</title>
  <meta name="description" content="${esc(meta?.description || '')}">
  <meta property="og:title" content="${esc(meta?.title || '')}">
  <meta property="og:description" content="${esc(meta?.description || '')}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsUrl}" rel="stylesheet">
  <style>${themeCss}\n${baseCss}</style>
</head>
<body>
  ${sectionsHtml}
</body>
</html>`;
}
