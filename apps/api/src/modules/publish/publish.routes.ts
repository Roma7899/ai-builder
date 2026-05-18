import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';

export default async function (fastify: FastifyInstance) {
  const service = new PublishService(fastify.prisma, fastify.redis);
  const controller = new PublishController(service);

  fastify.post('/projects/:id', {
    preHandler: [authenticate, rls],
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  }, controller.startDeployment);
  fastify.get('/projects/:id/stream', {
    preHandler: [authenticate],
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
  }, controller.stream);
}
