import type { FastifyRequest, FastifyReply } from 'fastify';
import { EditorService } from './editor.service';
import { AppError } from '../auth/auth.service';
import { siteJSONSchema } from '../generation/generation.schema';

export class EditorController {
  constructor(private editorService: EditorService) {}

  getProjectData = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const data = await this.editorService.getProjectData(id, request.userId);
      return reply.send(data);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  saveSiteVersion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { siteJson } = request.body as { siteJson: unknown };

    const parsed = siteJSONSchema.safeParse(siteJson);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'INVALID_SITE_JSON',
        details: parsed.error.issues,
      });
    }

    try {
      const version = await this.editorService.saveSiteVersion(id, request.userId, parsed.data);
      return reply.send(version);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  addSection = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { type, afterSectionId } = request.body as { type: string; afterSectionId?: string };
    try {
      const result = await this.editorService.addSection(id, request.userId, type, afterSectionId);
      return reply.status(201).send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  deleteSection = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, sectionId } = request.params as { id: string; sectionId: string };
    try {
      const result = await this.editorService.deleteSection(id, request.userId, sectionId);
      return reply.send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  reorderSections = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { orderedIds } = request.body as { orderedIds: string[] };
    try {
      const result = await this.editorService.reorderSections(id, request.userId, orderedIds);
      return reply.send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  regenerateSection = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, sectionId } = request.params as { id: string; sectionId: string };
    const { prompt } = request.body as { prompt: string };
    try {
      const result = await this.editorService.regenerateSection(id, request.userId, sectionId, prompt);
      return reply.send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  listVersions = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const versions = await this.editorService.listVersions(id, request.userId);
      return reply.send(versions);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  restoreVersion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, v } = request.params as { id: string; v: string };
    try {
      const result = await this.editorService.restoreVersion(id, request.userId, parseInt(v, 10));
      return reply.send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  private handleError(reply: FastifyReply, err: unknown) {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
