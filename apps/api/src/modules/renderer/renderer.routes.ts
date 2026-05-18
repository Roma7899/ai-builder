import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { RendererController } from './renderer.controller';
import { RendererService } from './renderer.service';

export default async function (fastify: FastifyInstance) {
  const service = new RendererService(fastify.prisma);
  const controller = new RendererController(service);

  fastify.post('/session', { preHandler: [authenticate] }, controller.createSession);
  fastify.get('/:projectId', { preHandler: [authenticate] }, controller.getSiteJson);
  fastify.post('/:projectId/snapshot', { preHandler: [authenticate, rls] }, controller.generateSnapshot);
}
