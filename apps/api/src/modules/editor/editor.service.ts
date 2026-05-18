import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { AppError } from '../auth/auth.service';
import { sectionTypeEnum } from './editor.schema';
import { withRls } from '../../lib/withRls';

const SECTION_TYPES = [
  'hero', 'features', 'pricing', 'testimonials', 'faq', 'contact_form',
  'gallery', 'team', 'cta_banner', 'stats', 'logo_strip', 'footer',
] as const;

function createOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

function generateId(): string {
  return `${Math.random().toString(36).slice(2, 9)}`;
}

export class EditorService {
  constructor(private prisma: PrismaClient) {}

  private verifyOwnership(projectId: string, userId: string) {
    return withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError(404, 'Project not found');
      if (project.userId !== userId) throw new AppError(403, 'Forbidden');
      if (project.status === 'deleted') throw new AppError(400, 'Project is deleted');
      return project;
    });
  }

  private getLatestSiteJson(projectId: string, userId: string): Promise<any> {
    return withRls(this.prisma, userId, async (tx) => {
      const version = await tx.siteVersion.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      });
      if (!version) {
        return {
          meta: { title: '', description: '', language: 'en' },
          theme: { primary_color: '#2563EB', font_heading: 'Inter', font_body: 'Inter', border_radius: '8px' },
          sections: [],
        };
      }
      return version.siteJson;
    });
  }

  private saveNewVersion(projectId: string, userId: string, siteJson: any) {
    return withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError(404, 'Project not found');

      const newVersion = project.currentVersion + 1;

      await tx.siteVersion.create({
        data: {
          projectId,
          version: newVersion,
          siteJson: siteJson as any,
          promptUsed: 'Editor save',
          createdBy: 'user',
        },
      });
      const updated = await tx.project.updateMany({
        where: { id: projectId, currentVersion: project.currentVersion },
        data: { currentVersion: newVersion },
      });
      if (updated.count === 0) {
        throw new AppError(409, 'Version conflict: project was modified by another session');
      }

      return { version: newVersion, siteJson };
    });
  }

  async getProjectData(projectId: string, userId: string) {
    return withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError(404, 'Project not found');
      if (project.userId !== userId) throw new AppError(403, 'Forbidden');
      const siteJson = await this.getLatestSiteJson(projectId, userId);
      const versions = await tx.siteVersion.findMany({
        where: { projectId },
        orderBy: { version: 'desc' },
        take: 50,
        select: { id: true, version: true, createdAt: true, createdBy: true },
      });
      return { siteJson, version: project.currentVersion, versions };
    });
  }

  async saveSiteVersion(projectId: string, userId: string, siteJson: unknown) {
    await this.verifyOwnership(projectId, userId);
    return this.saveNewVersion(projectId, userId, siteJson);
  }

  async addSection(projectId: string, userId: string, type: string, afterSectionId?: string) {
    await this.verifyOwnership(projectId, userId);

    if (!SECTION_TYPES.includes(type as any)) {
      throw new AppError(400, `Invalid section type: ${type}`);
    }

    const siteJson = await this.getLatestSiteJson(projectId, userId);
    const newSection = {
      id: `${type}-${generateId()}`,
      type,
      order: 0,
      visible: true,
      props: getDefaultProps(type),
    };

    const sections = siteJson.sections || [];
    const insertIndex = afterSectionId
      ? sections.findIndex((s: any) => s.id === afterSectionId) + 1
      : sections.length;

    sections.splice(insertIndex, 0, newSection);
    sections.forEach((s: any, i: number) => { s.order = i; });

    const result = await this.saveNewVersion(projectId, userId, { ...siteJson, sections });
    return { section: newSection, ...result };
  }

  async deleteSection(projectId: string, userId: string, sectionId: string) {
    await this.verifyOwnership(projectId, userId);

    const siteJson = await this.getLatestSiteJson(projectId, userId);
    const sections = (siteJson.sections || []).filter((s: any) => s.id !== sectionId);

    if (sections.length === (siteJson.sections || []).length) {
      throw new AppError(404, 'Section not found');
    }

    sections.forEach((s: any, i: number) => { s.order = i; });

    return this.saveNewVersion(projectId, userId, { ...siteJson, sections });
  }

  async reorderSections(projectId: string, userId: string, orderedIds: string[]) {
    await this.verifyOwnership(projectId, userId);

    const siteJson = await this.getLatestSiteJson(projectId, userId);
    const sectionsMap = new Map((siteJson.sections || []).map((s: any) => [s.id, s]));

    const reordered = orderedIds
      .map((id, i) => {
        const section = sectionsMap.get(id);
        if (section) {
          (section as any).order = i;
          return section;
        }
        return null;
      })
      .filter(Boolean);

    if (reordered.length !== (siteJson.sections || []).length) {
      throw new AppError(400, 'orderedIds must include all sections');
    }

    return this.saveNewVersion(projectId, userId, { ...siteJson, sections: reordered });
  }

  async regenerateSection(projectId: string, userId: string, sectionId: string, prompt: string) {
    await this.verifyOwnership(projectId, userId);

    const siteJson = await this.getLatestSiteJson(projectId, userId);
    const section = (siteJson.sections || []).find((s: any) => s.id === sectionId);
    if (!section) throw new AppError(404, 'Section not found');

    const systemPrompt = [
      `You are a web content generator. Update ONLY the props for a "${section.type}" section.`,
      `Current props: ${JSON.stringify(section.props)}`,
      `User request: ${prompt}`,
      '',
      'Return ONLY a JSON object with the updated props. No markdown, no explanation.',
      'Keep the same structure but improve the content based on the request.',
    ].join('\n');

    try {
      const openai = createOpenAI();
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new AppError(500, 'LLM returned empty response');

      const newProps = JSON.parse(content);
      const merged = { ...section.props, ...newProps };
      const index = siteJson.sections.findIndex((s: any) => s.id === sectionId);
      siteJson.sections[index].props = merged;

      const result = await this.saveNewVersion(projectId, userId, siteJson);
      return { props: merged, ...result };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, `Regeneration failed: ${err.message}`);
    }
  }

  async listVersions(projectId: string, userId: string) {
    await this.verifyOwnership(projectId, userId);
    return withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findMany({
        where: { projectId },
        orderBy: { version: 'desc' },
        select: { id: true, version: true, createdAt: true, createdBy: true },
      })
    );
  }

  async restoreVersion(projectId: string, userId: string, version: number) {
    await this.verifyOwnership(projectId, userId);

    return withRls(this.prisma, userId, async (tx) => {
      const siteVersion = await tx.siteVersion.findUnique({
        where: { projectId_version: { projectId, version } },
      });
      if (!siteVersion) throw new AppError(404, 'Version not found');

      return this.saveNewVersion(projectId, userId, siteVersion.siteJson);
    });
  }
}

function getDefaultProps(type: string): Record<string, unknown> {
  const defaults: Record<string, Record<string, unknown>> = {
    hero: { heading: 'New Section', subheading: '', cta_text: 'Get Started', cta_link: '#', layout: 'centered' },
    features: { heading: 'Features', features: [{ title: 'Feature 1', description: 'Description here' }] },
    pricing: { heading: 'Pricing', plans: [{ name: 'Basic', price: '$9', features: ['Feature 1'], cta: 'Get Started' }] },
    testimonials: { heading: 'Testimonials', testimonials: [{ name: 'Customer', role: 'Client', quote: 'Great service!' }] },
    faq: { heading: 'FAQ', items: [{ question: 'Question?', answer: 'Answer here.' }] },
    contact_form: { heading: 'Contact Us', button_text: 'Send Message' },
    gallery: { heading: 'Gallery', images: [] },
    team: { heading: 'Our Team', members: [{ name: 'Name', role: 'Role' }] },
    cta_banner: { heading: 'Call to Action', button_text: 'Get Started', button_link: '#' },
    stats: { heading: 'Stats', stats: [{ value: '100+', label: 'Clients' }] },
    logo_strip: { heading: 'Trusted By', logos: [] },
    footer: { copyright: `\u00A9 ${new Date().getFullYear()} All rights reserved.`, columns: [] },
  };
  return defaults[type] ?? {};
}
