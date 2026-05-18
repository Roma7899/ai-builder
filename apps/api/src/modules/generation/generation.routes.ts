import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { withRls } from '../../lib/withRls';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

export default async function (fastify: FastifyInstance) {
  const service = new GenerationService(fastify.prisma, fastify.redis);
  const controller = new GenerationController(service);

  fastify.post('/', {
    preHandler: [authenticate, rls],
    config: {
      rateLimit: {
        max: async (req) => {
          const userId = (req as any).userId;
          if (!userId) return 3;
          const user = await withRls((req as any).server.prisma, userId, async (tx) =>
            tx.user.findUnique({
              where: { id: userId },
              select: { plan: true },
            })
          );
          if (!user || user.plan === 'scale' || user.plan === 'admin') return 0;
          if (user.plan === 'pro') return 50;
          return 3;
        },
        timeWindow: '1 hour',
      },
    },
  }, controller.startGeneration);
  fastify.get('/:jobId/stream', {
    preHandler: [authenticate],
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
  }, controller.stream);
}
