import type { SiteJSON, SectionNode } from '../../../types/site.types';

function generateSectionHTML(section: SectionNode, theme: SiteJSON['theme']): string {
  const p = section.props as Record<string, any>;
  const pc = theme.primary_color;

  switch (section.type) {
    case 'hero':
      return `<section style="padding:100px 24px;text-align:${p.layout === 'split' ? 'left' : 'center'};background:linear-gradient(135deg,${pc}11,${pc}22);min-height:80vh;display:flex;align-items:center;justify-content:center">
        <div style="max-width:800px;width:100%">
          <h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:800;margin:0 0 16px;line-height:1.15">${p.heading || ''}</h1>
          ${p.subheading ? `<p style="font-size:1.2rem;color:#555;margin:0 0 32px;line-height:1.6">${p.subheading}</p>` : ''}
          ${p.cta_text ? `<a href="${p.cta_link || '#'}" style="display:inline-block;padding:14px 32px;background:${pc};color:#fff;border-radius:${theme.border_radius};text-decoration:none;font-weight:600;font-size:1rem">${p.cta_text}</a>` : ''}
        </div>
      </section>`;
    case 'features':
      return `<section style="padding:80px 24px;background:#fff">
        <div style="max-width:1100px;margin:0 auto">
          <h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 8px">${p.heading || 'Features'}</h2>
          ${p.subheading ? `<p style="text-align:center;color:#666;margin:0 0 48px">${p.subheading}</p>` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px">
            ${(p.features || []).map((f: any) => `<div style="padding:32px;border-radius:${theme.border_radius};border:1px solid #e5e7eb;text-align:center">
              ${f.icon ? `<div style="font-size:2rem;margin-bottom:12px">${f.icon}</div>` : ''}
              <h3 style="font-size:1.1rem;font-weight:600;margin:0 0 8px">${f.title || ''}</h3>
              <p style="color:#666;margin:0;line-height:1.6;font-size:0.95rem">${f.description || ''}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'pricing':
      return `<section style="padding:80px 24px;background:#f9fafb">
        <div style="max-width:1100px;margin:0 auto">
          <h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px">${p.heading || 'Pricing'}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;align-items:start">
            ${(p.plans || []).map((plan: any) => `<div style="padding:32px;border-radius:${theme.border_radius};border:${plan.highlighted ? '2px solid ' + pc : '1px solid #e5e7eb'};background:${plan.highlighted ? '#fff' : '#fff'};position:relative;${plan.highlighted ? 'box-shadow:0 8px 32px rgba(0,0,0,0.1)' : ''}">
              ${plan.highlighted ? `<div style="position:absolute;top:0;left:50%;transform:translate(-50%,-50%);background:${pc};color:#fff;padding:4px 16px;border-radius:20px;font-size:0.8rem;font-weight:600">Popular</div>` : ''}
              <h3 style="font-size:1.3rem;font-weight:600;margin:0 0 8px">${plan.name || ''}</h3>
              <div style="font-size:2.5rem;font-weight:800;margin:0 0 4px;color:${pc}">${plan.price || ''}</div>
              ${plan.period ? `<div style="color:#999;font-size:0.9rem;margin-bottom:24px">${plan.period}</div>` : ''}
              <ul style="list-style:none;padding:0;margin:0 0 24px;space-y:8">
                ${(plan.features || []).map((f: string) => `<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:0.9rem">${f}</li>`).join('')}
              </ul>
              <a href="#" style="display:block;text-align:center;padding:12px;background:${plan.highlighted ? pc : '#f3f4f6'};color:${plan.highlighted ? '#fff' : '#333'};border-radius:${theme.border_radius};text-decoration:none;font-weight:600">${plan.cta || 'Get Started'}</a>
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'testimonials':
      return `<section style="padding:80px 24px;background:#fff">
        <div style="max-width:900px;margin:0 auto">
          <h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px">${p.heading || 'Testimonials'}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px">
            ${(p.testimonials || []).map((t: any) => `<div style="padding:24px;border-radius:${theme.border_radius};border:1px solid #e5e7eb;background:#fafafa">
              <p style="font-style:italic;color:#555;line-height:1.6;margin:0 0 16px">"${t.quote || ''}"</p>
              <div style="font-weight:600">${t.name || ''}</div>
              <div style="color:#999;font-size:0.85rem">${t.role || ''}${t.company ? `, ${t.company}` : ''}</div>
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'faq':
      return `<section style="padding:80px 24px;background:#f9fafb">
        <div style="max-width:800px;margin:0 auto">
          <h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px">${p.heading || 'FAQ'}</h2>
          <div style="space-y:2">
            ${(p.items || []).map((item: any) => `<details style="border:1px solid #e5e7eb;border-radius:${theme.border_radius};padding:16px 20px;margin-bottom:8px;background:#fff">
              <summary style="font-weight:600;cursor:pointer">${item.question || ''}</summary>
              <p style="color:#555;margin:12px 0 0;line-height:1.6">${item.answer || ''}</p>
            </details>`).join('')}
          </div>
        </div>
      </section>`;
    case 'contact_form':
      return `<section style="padding:80px 24px;background:#fff">
        <div style="max-width:600px;margin:0 auto;text-align:center">
          <h2 style="font-size:2rem;font-weight:700;margin:0 0 8px">${p.heading || 'Contact Us'}</h2>
          ${p.subheading ? `<p style="color:#666;margin:0 0 32px">${p.subheading}</p>` : ''}
          <form style="text-align:left;space-y:16px">
            <input placeholder="${p.name_placeholder || 'Your Name'}" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:${theme.border_radius};font-size:1rem;box-sizing:border-box;margin-bottom:12px" />
            <input placeholder="${p.email_placeholder || 'Your Email'}" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:${theme.border_radius};font-size:1rem;box-sizing:border-box;margin-bottom:12px" />
            <textarea placeholder="Message" rows={4} style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:${theme.border_radius};font-size:1rem;box-sizing:border-box;margin-bottom:16px;resize:vertical"></textarea>
            <button type="submit" style="width:100%;padding:14px;background:${pc};color:#fff;border:none;border-radius:${theme.border_radius};font-size:1rem;font-weight:600;cursor:pointer">${p.button_text || 'Send'}</button>
          </form>
        </div>
      </section>`;
    case 'gallery':
      return `<section style="padding:80px 24px;background:#f9fafb">
        <div style="max-width:1100px;margin:0 auto">
          <h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px">${p.heading || 'Gallery'}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px">
            ${(p.images || []).map((img: any) => `<div style="border-radius:${theme.border_radius};overflow:hidden;aspect-ratio:4/3;background:#e5e7eb">
              ${img.src ? `<img src="${img.src}" alt="${img.alt || ''}" style="width:100%;height:100%;object-fit:cover" />` : ''}
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'team':
      return `<section style="padding:80px 24px;background:#fff">
        <div style="max-width:1100px;margin:0 auto">
          <h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px">${p.heading || 'Our Team'}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px">
            ${(p.members || []).map((m: any) => `<div style="text-align:center;padding:24px;border-radius:${theme.border_radius};border:1px solid #e5e7eb">
              <div style="width:80px;height:80px;border-radius:50%;background:${pc}22;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:2rem">${(m.name || '?')[0]}</div>
              <h3 style="font-weight:600;margin:0 0 4px">${m.name || ''}</h3>
              <div style="color:${pc};font-size:0.9rem;margin-bottom:8px">${m.role || ''}</div>
              ${m.bio ? `<p style="color:#666;font-size:0.85rem;line-height:1.5;margin:0">${m.bio}</p>` : ''}
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'cta_banner':
      return `<section style="padding:80px 24px;text-align:center;background:${p.background_color || pc};color:#fff">
        <div style="max-width:700px;margin:0 auto">
          <h2 style="font-size:2rem;font-weight:700;margin:0 0 8px">${p.heading || ''}</h2>
          ${p.subheading ? `<p style="opacity:0.9;margin:0 0 32px;font-size:1.1rem">${p.subheading}</p>` : ''}
          ${p.button_text ? `<a href="${p.button_link || '#'}" style="display:inline-block;padding:14px 32px;background:#fff;color:#333;border-radius:${theme.border_radius};text-decoration:none;font-weight:600">${p.button_text}</a>` : ''}
        </div>
      </section>`;
    case 'stats':
      return `<section style="padding:80px 24px;background:#f9fafb">
        <div style="max-width:900px;margin:0 auto">
          ${p.heading ? `<h2 style="text-align:center;font-size:2rem;font-weight:700;margin:0 0 48px">${p.heading}</h2>` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;text-align:center">
            ${(p.stats || []).map((s: any) => `<div style="padding:24px">
              <div style="font-size:2.5rem;font-weight:800;color:${pc}">${s.value || ''}</div>
              <div style="color:#666;font-size:0.95rem">${s.label || ''}</div>
            </div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'logo_strip':
      return `<section style="padding:60px 24px;background:#fff">
        <div style="max-width:900px;margin:0 auto;text-align:center">
          ${p.heading ? `<h2 style="font-size:1.3rem;font-weight:600;color:#666;margin:0 0 32px">${p.heading}</h2>` : ''}
          <div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:40px;opacity:0.5">
            ${(p.logos || []).map((l: any) => `<div style="font-size:1.1rem;font-weight:600;color:#999">${l.alt || 'Logo'}</div>`).join('')}
          </div>
        </div>
      </section>`;
    case 'footer':
      const colData = (p.columns || []) as Array<{ title: string; links: Array<{ label: string; url: string }> }>;
      return `<footer style="padding:60px 24px 40px;background:#1e293b;color:#cbd5e1">
        <div style="max-width:1100px;margin:0 auto">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:32px;margin-bottom:32px">
            ${colData.map((col) => `<div>
              <h4 style="color:#fff;font-weight:600;margin:0 0 12px;font-size:0.95rem">${col.title || ''}</h4>
              <ul style="list-style:none;padding:0;margin:0;space-y:2">
                ${(col.links || []).map((link) => `<li style="margin-bottom:6px"><a href="${link.url || '#'}" style="color:#94a3b8;text-decoration:none;font-size:0.9rem">${link.label || ''}</a></li>`).join('')}
              </ul>
            </div>`).join('')}
          </div>
          <div style="display:flex;justify-content:center;gap:16px;margin-bottom:24px">
            ${(p.social || []).map((s: any) => `<a href="${s.url || '#'}" style="color:#94a3b8;text-decoration:none;font-size:0.9rem">${s.platform || ''}</a>`).join('')}
          </div>
          <div style="text-align:center;font-size:0.85rem;color:#64748b;border-top:1px solid #334155;padding-top:24px">${p.copyright || ''}</div>
        </div>
      </footer>`;
    default:
      return '';
  }
}

export function generateHTML(siteJson: SiteJSON): string {
  const { meta, theme, sections } = siteJson;
  const visibleSections = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);

  return `<!DOCTYPE html>
<html lang="${meta.language || 'en'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title || ''}</title>
  <meta name="description" content="${meta.description || ''}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: '${theme.font_body}', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4, h5, h6 { font-family: '${theme.font_heading}', system-ui, -apple-system, sans-serif; }
    img { max-width: 100%; height: auto; }
    a { color: ${theme.primary_color}; }
    @media (max-width: 768px) {
      section { padding: 48px 16px !important; }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${theme.font_heading.replace(/ /g, '+')}:wght@300;400;500;600;700;800&family=${theme.font_body.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body>
  ${visibleSections.map((s) => generateSectionHTML(s, theme)).join('\n  ')}
</body>
</html>`;
}

export function downloadZip(siteJson: SiteJSON) {
  const html = generateHTML(siteJson);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'index.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
