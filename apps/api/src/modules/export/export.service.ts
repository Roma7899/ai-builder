import { PrismaClient } from '@prisma/client';
import archiver from 'archiver';
import { AppError } from '../auth/auth.service';
import { renderFullHTML, buildThemeCSS, buildBaseCSS } from '../publish/html.builder';
import { uploadFile, getSignedDownloadUrl } from '../publish/cdn.client';
import type { SiteJSON } from '../publish/html.builder';
import { withRls } from '../../lib/withRls';

const EXPORT_README = `Exported from AI Website Builder
===============================

This ZIP contains a complete static website.

To host this site:

1. Netlify: Drag the index.html file to https://app.netlify.com/drop
2. Vercel: Install Vercel CLI and run 'vercel --prod'
3. GitHub Pages: Push to a repo and enable Pages
4. Any static host: Upload the entire contents to your web server

No build step required. The HTML file includes all styles inline.
`;

export class ExportService {
  constructor(private prisma: PrismaClient) {}

  private async getSiteJson(projectId: string, userId: string): Promise<SiteJSON> {
    const siteVersion = await withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      })
    );
    if (!siteVersion) throw new AppError(404, 'No site version found');
    return siteVersion.siteJson as unknown as SiteJSON;
  }

  /**
   * Generates a downloadable export ZIP containing the full site HTML,
   * a CSS file, and a README.
   * Uploads the ZIP to R2 and returns a presigned download URL (5 min TTL).
   */
  async generateExportZip(projectId: string, userId: string): Promise<string> {
    await withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError(404, 'Project not found');
      if (project.userId !== userId) throw new AppError(403, 'Forbidden');
      return project;
    });

    const siteJson = await this.getSiteJson(projectId, userId);
    const html = renderFullHTML(siteJson);
    const css = buildThemeCSS(siteJson.theme) + '\n' + buildBaseCSS();
    const key = `exports/${projectId}/site-${Date.now()}.zip`;

    const zipBuffer = await this.buildZip(html, css);

    await uploadFile(key, zipBuffer, 'application/zip', 'private, max-age=0');

    return getSignedDownloadUrl(key, 300);
  }

  private buildZip(html: string, css: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      archive.append(html, { name: 'index.html' });
      archive.append(css, { name: 'assets/style.css' });
      archive.append(EXPORT_README, { name: 'README.txt' });
      archive.finalize();
    });
  }
}
