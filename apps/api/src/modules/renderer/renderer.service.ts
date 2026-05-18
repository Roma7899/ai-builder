import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PrismaClient } from '@prisma/client';
import { withRls } from '../../lib/withRls';
import { sanitizeUrl } from '../publish/html.builder';

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export class RendererService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Returns the latest SiteJSON for a project, or null.
   */
  async getSiteJson(projectId: string, userId: string) {
    const version = await withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      })
    );
    if (!version) return null;
    return version.siteJson;
  }

  /**
   * Generates a complete SSR HTML snapshot of the site.
   * Uses React renderToStaticMarkup when the import is available,
   * otherwise falls back to direct HTML construction from SiteJSON.
   */
  async generateSnapshot(projectId: string, userId: string): Promise<string | null> {
    const version = await withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      })
    );
    if (!version) return null;

    const siteJson = version.siteJson as any;
    let bodyHtml: string;

    try {
      const rendererPath = '../../../../../apps/renderer/src/SiteRenderer' as string;
      const { default: SiteRenderer } = await import(
        /* @vite-ignore */
        rendererPath
      );
      bodyHtml = renderToStaticMarkup(
        React.createElement(SiteRenderer, { siteJson, highlightedSectionId: undefined })
      );
    } catch {
      bodyHtml = this.buildBodyFromJson(siteJson);
    }

    return this.wrapHtml(siteJson, bodyHtml);
  }

  private buildBodyFromJson(siteJson: any): string {
    if (!siteJson.sections?.length) return '<p>No sections</p>';

    return siteJson.sections
      .filter((s: any) => s.visible)
      .sort((a: any, b: any) => a.order - b.order)
      .map((section: any) => this.renderSectionStatic(section))
      .join('\n');
  }

  private renderSectionStatic(section: any): string {
    const p = section.props || {};
    const style = 'font-family:var(--font-body)';

    switch (section.type) {
      case 'hero':
        return `<section class="py-20 px-4" style="background:#f9fafb;${style}"><div class="max-w-6xl mx-auto text-center"><h1 class="text-5xl font-bold mb-6" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading || '')}</h1>${p.subheading ? `<p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">${this.esc(p.subheading)}</p>` : ''}${p.cta_text ? `<a href="${this.esc(sanitizeUrl(String(p.cta_link || '#')))}" class="inline-block px-8 py-3 text-white font-semibold text-lg rounded-lg no-underline" style="background-color:var(--color-primary);border-radius:var(--border-radius)">${this.esc(p.cta_text)}</a>` : ''}</div></section>`;

      case 'features':
        const features: any[] = p.features || [];
        return `<section class="py-16 px-4" style="background:#fff;${style}"><div class="max-w-6xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="grid md:grid-cols-3 gap-8">${features.map((f, i) => `<div class="p-6 rounded-xl border border-gray-100 text-center"><div class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4" style="background:var(--color-primary)">${i + 1}</div><h3 class="text-lg font-semibold mb-2">${this.esc(f.title || '')}</h3><p class="text-gray-500 text-sm">${this.esc(f.description || '')}</p></div>`).join('')}</div></div></section>`;

      case 'pricing':
        const plans: any[] = p.plans || [];
        return `<section class="py-16 px-4" style="background:#f9fafb;${style}"><div class="max-w-6xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="grid md:grid-cols-${Math.min(plans.length || 1, 3)} gap-8 max-w-4xl mx-auto">${plans.map((plan) => `<div class="bg-white rounded-xl p-8 border border-gray-200 text-center ${plan.highlighted ? 'ring-2 scale-105 relative' : ''}" style="border-color:${plan.highlighted ? 'var(--color-primary)' : '#e5e7eb'}">${plan.highlighted ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold text-white rounded-full" style="background:var(--color-primary)">Popular</span>' : ''}<h3 class="text-xl font-bold mb-2">${this.esc(plan.name || '')}</h3><p class="text-4xl font-bold mb-6" style="color:var(--color-primary)">${this.esc(plan.price || '')}</p>${plan.features?.length ? `<ul class="text-left space-y-2 mb-8">${plan.features.map((f: string) => `<li class="flex items-center gap-2 text-sm text-gray-600"><span style="color:var(--color-primary)">\u2713</span> ${this.esc(f)}</li>`).join('')}</ul>` : ''}<a href="#" class="block w-full py-2.5 rounded-lg text-white font-semibold text-sm no-underline" style="background:${plan.highlighted ? 'var(--color-primary)' : '#374151'};border-radius:var(--border-radius)">${this.esc(plan.cta || 'Get Started')}</a></div>`).join('')}</div></div></section>`;

      case 'testimonials':
        const testimonials: any[] = p.testimonials || [];
        return `<section class="py-16 px-4" style="background:#fff;${style}"><div class="max-w-6xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="grid md:grid-cols-${Math.min(testimonials.length, 3)} gap-8">${testimonials.map((t) => `<div class="bg-gray-50 rounded-xl p-6 border border-gray-100"><p class="text-gray-600 italic mb-6">\u201C${this.esc(t.quote || '')}\u201D</p><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-sm font-bold">${(t.name || '?')[0]}</div><div><p class="font-semibold text-sm">${this.esc(t.name || '')}</p><p class="text-xs text-gray-400">${this.esc(t.role || '')}${t.company ? ` \u00B7 ${this.esc(t.company)}` : ''}</p></div></div></div>`).join('')}</div></div></section>`;

      case 'faq':
        const items: any[] = p.items || [];
        return `<section class="py-16 px-4" style="background:#f9fafb;${style}"><div class="max-w-3xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="space-y-4">${items.map((item) => `<details class="bg-white rounded-xl border border-gray-200 p-5"><summary class="font-semibold cursor-pointer text-gray-900">${this.esc(item.question || '')}</summary><p class="mt-3 text-gray-600 text-sm">${this.esc(item.answer || '')}</p></details>`).join('')}</div></div></section>`;

      case 'contact_form':
        return `<section class="py-16 px-4" style="background:#fff;${style}"><div class="max-w-xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-2" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}${p.subheading ? `<p class="text-gray-500 text-center mb-8">${this.esc(p.subheading)}</p>` : ''}<form class="space-y-4"><input placeholder="${this.esc(p.name_placeholder || 'Your Name')}" class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm"><input placeholder="${this.esc(p.email_placeholder || 'Your Email')}" type="email" class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm"><textarea rows={4} placeholder="Your Message" class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm"></textarea><button type="button" class="w-full py-2.5 text-white font-semibold rounded-lg text-sm" style="background:var(--color-primary);border-radius:var(--border-radius)">${this.esc(p.button_text || 'Send Message')}</button></form></div></section>`;

      case 'gallery':
        const images: any[] = p.images || [];
        return `<section class="py-16 px-4" style="background:#f9fafb;${style}"><div class="max-w-6xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="grid grid-cols-2 md:grid-cols-3 gap-4">${(images.length ? images : [{}, {}, {}, {}, {}, {}]).map((img) => `<div class="aspect-square bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">${img.src ? `<img src="${this.esc(sanitizeUrl(String(img.src)))}" alt="${this.esc(img.alt || '')}" class="w-full h-full object-cover rounded-xl">` : 'Image'}</div>`).join('')}</div></div></section>`;

      case 'team':
        const members: any[] = p.members || [];
        return `<section class="py-16 px-4" style="background:#fff;${style}"><div class="max-w-6xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="grid grid-cols-2 md:grid-cols-4 gap-8">${members.map((m) => `<div class="text-center"><div class="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center text-gray-400 text-2xl font-bold">${(m.name || '?')[0]}</div><h3 class="font-semibold text-gray-900">${this.esc(m.name || '')}</h3><p class="text-sm text-gray-500">${this.esc(m.role || '')}</p></div>`).join('')}</div></div></section>`;

      case 'cta_banner':
        return `<section class="py-20 px-4 text-white text-center" style="background:${this.esc(p.background_color || 'var(--color-primary)')};${style}"><div class="max-w-3xl mx-auto"><h2 class="text-3xl font-bold mb-4" style="font-family:var(--font-heading)">${this.esc(p.heading || '')}</h2>${p.subheading ? `<p class="text-lg opacity-90 mb-8">${this.esc(p.subheading)}</p>` : ''}<a href="${this.esc(sanitizeUrl(String(p.button_link || '#')))}" class="inline-block px-8 py-3 bg-white font-semibold rounded-lg no-underline" style="color:var(--color-primary);border-radius:var(--border-radius)">${this.esc(p.button_text || 'Get Started')}</a></div></section>`;

      case 'stats':
        const stats: any[] = p.stats || [];
        return `<section class="py-16 px-4" style="background:#f9fafb;${style}"><div class="max-w-5xl mx-auto">${p.heading ? `<h2 class="text-3xl font-bold text-center mb-12" style="font-family:var(--font-heading);color:#111827">${this.esc(p.heading)}</h2>` : ''}<div class="grid grid-cols-2 md:grid-cols-4 gap-8">${stats.map((s) => `<div class="text-center"><p class="text-4xl font-bold" style="color:var(--color-primary)">${this.esc(s.value || '')}</p><p class="text-gray-500 text-sm mt-1">${this.esc(s.label || '')}</p></div>`).join('')}</div></div></section>`;

      case 'logo_strip':
        const logos: any[] = p.logos || [];
        return `<section class="py-12 px-4" style="background:#fff;${style}"><div class="max-w-5xl mx-auto">${p.heading ? `<p class="text-sm text-gray-400 text-center mb-6 uppercase tracking-wider">${this.esc(p.heading)}</p>` : ''}<div class="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale">${logos.length ? logos.map((logo) => `<div class="h-8 w-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">${logo.src ? `<img src="${this.esc(sanitizeUrl(String(logo.src)))}" alt="${this.esc(logo.alt || 'logo')}" class="h-full object-contain">` : 'Logo'}</div>`).join('') : [1, 2, 3, 4].map((i) => `<div class="h-8 w-24 bg-gray-200 rounded" key={i}></div>`).join('')}</div></div></section>`;

      case 'footer':
        const columns: any[] = p.columns || [];
        const social: any[] = p.social || [];
        return `<footer class="bg-gray-900 text-gray-300 px-4 py-12" style="${style}"><div class="max-w-6xl mx-auto"><div class="grid md:grid-cols-${Math.max(columns.length, 1)} gap-8 mb-8">${columns.length ? columns.map((col) => `<div><h4 class="font-semibold text-white mb-3">${this.esc(col.title || '')}</h4><ul class="space-y-2">${(col.links || []).map((link: any) => `<li><a href="${this.esc(sanitizeUrl(String(link.url || '#')))}" class="text-sm hover:text-white no-underline">${this.esc(link.label || '')}</a></li>`).join('')}</ul></div>`) : `<div><h4 class="font-semibold text-white mb-3">About</h4><ul class="space-y-2 text-sm"><li>About us</li><li>Contact</li></ul></div>`}</div>${social.length ? `<div class="flex gap-4 justify-center mb-8 pt-8 border-t border-gray-800">${social.map((s) => `<a href="${this.esc(sanitizeUrl(String(s.url || '#')))}" class="text-gray-400 hover:text-white text-sm no-underline">${this.esc(s.platform || 'Social')}</a>`).join('')}</div>` : ''}<div class="text-center text-sm text-gray-500 pt-8 border-t border-gray-800">${this.esc(p.copyright || `\u00A9 ${new Date().getFullYear()} All rights reserved.`)}</div></div></footer>`;

      default:
        return `<section class="py-12 px-4 text-center text-gray-400" style="${style}"><div class="max-w-6xl mx-auto"><p>${section.type} section</p></div></section>`;
    }
  }

  private esc(str: string): string {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private wrapHtml(siteJson: any, bodyHtml: string): string {
    const theme = siteJson.theme || {};
    const primary = theme.primary_color || '#2563EB';

    return `<!DOCTYPE html>
<html lang="${this.esc(siteJson.meta?.language || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.esc(siteJson.meta?.title || '')}</title>
  <meta name="description" content="${this.esc(siteJson.meta?.description || '')}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=${(theme.font_heading || 'Inter').replace(/ /g, '+')}:wght@400;600;700&family=${(theme.font_body || 'Inter').replace(/ /g, '+')}:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: ${primary};
      --color-primary-dark: ${adjustColor(primary, -20)};
      --color-primary-light: ${adjustColor(primary, 40)};
      --color-primary-rgb: ${parseInt(primary.slice(1, 3), 16)}, ${parseInt(primary.slice(3, 5), 16)}, ${parseInt(primary.slice(5, 7), 16)};
      --font-heading: '${theme.font_heading || 'Inter'}', sans-serif;
      --font-body: '${theme.font_body || 'Inter'}', sans-serif;
      --border-radius: ${theme.border_radius || '8px'};
    }
    body { font-family: var(--font-body); margin: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1f2937; }
    h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); color: #111827; }
    * { box-sizing: border-box; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; }
    [data-section-id] { position: relative; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  }
}
