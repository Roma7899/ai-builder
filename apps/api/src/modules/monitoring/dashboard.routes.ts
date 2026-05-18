import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DashboardAggregator } from '../../lib/monitoring/dashboard';

export default async function (fastify: FastifyInstance) {
  const redis = fastify.redis;

  fastify.get('/admin/dashboard', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await DashboardAggregator.getDashboardData(redis);
      return reply.send(data);
    } catch (err: unknown) {
      fastify.log.error({ err }, 'Dashboard aggregation failed');
      return reply.status(500).send({ error: 'Dashboard unavailable', details: (err as Error).message });
    }
  });
}
