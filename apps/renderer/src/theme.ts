import type { SiteTheme } from './types/site.types';

function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Injects theme CSS variables onto document root and loads Google Fonts.
 */
export function applyTheme(theme: SiteTheme): void {
  const root = document.documentElement;
  const primary = theme.primary_color || '#2563EB';

  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-dark', adjustColor(primary, -20));
  root.style.setProperty('--color-primary-light', adjustColor(primary, 40));
  root.style.setProperty('--font-heading', `'${theme.font_heading}', sans-serif`);
  root.style.setProperty('--font-body', `'${theme.font_body}', sans-serif`);
  root.style.setProperty('--border-radius', theme.border_radius || '8px');

  const fontHeadingUrl = theme.font_heading
    ? theme.font_heading.replace(/ /g, '+')
    : 'Inter';
  const fontBodyUrl = theme.font_body
    ? theme.font_body.replace(/ /g, '+')
    : 'Inter';

  const linkId = 'renderer-google-fonts';
  const existing = document.getElementById(linkId);
  if (existing) existing.remove();

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontHeadingUrl}:wght@400;600;700&family=${fontBodyUrl}:wght@400;500;600&display=swap`;
  document.head.appendChild(link);
}
