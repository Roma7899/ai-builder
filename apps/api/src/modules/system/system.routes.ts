import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { getMetricsSnapshot, resetMetricsBucket } from '../../lib/metrics';
import { getRegionQueueName } from '../../lib/createWorker';
import { generationQueue } from '../generation/generation.service';
import { publishQueue } from '../publish/publish.service';

const SCAN_COUNT = 500;

export default async function (fastify: FastifyInstance) {
  fastify.get('/metrics/system', { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const redis = fastify.redis;

    const generateQueueName = getRegionQueueName('generate');
    const publishQueueName = getRegionQueueName('publish');

    const [genActive, genWaiting, genDelayed, pubActive, pubWaiting, pubDelayed] = await Promise.all([
      generationQueue.getActiveCount(),
      generationQueue.getWaitingCount(),
      generationQueue.getDelayedCount(),
      publishQueue.getActiveCount(),
      publishQueue.getWaitingCount(),
      publishQueue.getDelayedCount(),
    ]);

    const queueDepth = {
      [generateQueueName]: genActive + genWaiting + genDelayed,
      [publishQueueName]: pubActive + pubWaiting + pubDelayed,
    };

    let activeWorkers = 0;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'worker:heartbeat:*', 'COUNT', SCAN_COUNT);
      cursor = nextCursor;
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          const data = JSON.parse(raw);
          const age = Date.now() - new Date(data.timestamp).getTime();
          if (age < 30000) {
            activeWorkers++;
          }
        }
      }
    } while (cursor !== '0');

    const snapshot = await getMetricsSnapshot(redis, queueDepth, activeWorkers);
    return reply.send(snapshot);
  });

  fastify.get('/system/workers', { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const redis = fastify.redis;

    const workers: Array<{ workerId: string; region: string; lastHeartbeat: string; alive: boolean }> = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'worker:heartbeat:*', 'COUNT', SCAN_COUNT);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const raw = values[i];
          if (raw) {
            const data = JSON.parse(raw);
            const age = Date.now() - new Date(data.timestamp).getTime();
            workers.push({
              workerId: data.workerId,
              region: data.region,
              lastHeartbeat: data.timestamp,
              alive: age < 30000,
            });
          }
        }
      }
    } while (cursor !== '0');

    const regionDistribution: Record<string, number> = {};
    let aliveCount = 0;
    for (const w of workers) {
      regionDistribution[w.region] = (regionDistribution[w.region] || 0) + 1;
      if (w.alive) aliveCount++;
    }

    return reply.send({
      total: workers.length,
      alive: aliveCount,
      dead: workers.length - aliveCount,
      regions: regionDistribution,
      workers,
    });
  });

  fastify.post('/system/metrics/reset', { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const redis = fastify.redis;
    await resetMetricsBucket(redis);
    return reply.send({ ok: true });
  });
}
