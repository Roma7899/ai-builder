import type { FastifyRequest, FastifyReply } from 'fastify';
import { RendererService } from './renderer.service';
import { AppError } from '../auth/auth.service';
import { withRls } from '../../lib/withRls';
import { createSessionToken } from './renderer.session';

export class RendererController {
  constructor(private rendererService: RendererService) {}

  createSession = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;
    const sessionToken = createSessionToken(userId);
    return reply.send({ sessionToken, ttl: 300 });
  };

  getSiteJson = async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string };
    const userId = request.userId;

    try {
      const project = await withRls(request.server.prisma, userId, async (tx) =>
        tx.project.findUnique({
          where: { id: projectId },
          select: { userId: true },
        })
      );
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      if (project.userId !== userId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const siteJson = await this.rendererService.getSiteJson(projectId, userId);
      if (!siteJson) {
        return reply.status(404).send({ error: 'No site version found' });
      }
      return reply.send({ siteJson });
    } catch (err: any) {
      request.server.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  };

  generateSnapshot = async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string };
    const userId = request.userId;

    try {
      const project = await withRls(request.server.prisma, userId, async (tx) =>
        tx.project.findUnique({
          where: { id: projectId },
          select: { userId: true },
        })
      );
      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      if (project.userId !== userId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const html = await this.rendererService.generateSnapshot(projectId, userId);
      if (!html) {
        return reply.status(404).send({ error: 'No site version found' });
      }
      return reply.type('text/html').send(html);
    } catch (err: any) {
      request.server.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  };

  private handleError(reply: FastifyReply, err: unknown) {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
