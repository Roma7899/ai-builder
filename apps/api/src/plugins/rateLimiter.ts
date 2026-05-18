import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { getRedis } from '../lib/redisFactory';
import { config } from '../config';

const BURST_SCRIPT = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = redis.call('TIME')[1]
local windowStart = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
local count = redis.call('ZCARD', key)
if count >= max then
  return 0
end
redis.call('ZADD', key, now, now)
redis.call('EXPIRE', key, window)
return 1
`;

function mb(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = getRedis();

  fastify.addHook('onRequest', async (request, reply) => {
    const ip = request.ip;
    const burstKey = `burst:${ip}`;
    const result = await redis.eval(
      BURST_SCRIPT,
      1,
      burstKey,
      String(config.rateLimit.globalBurstMax),
      String(config.rateLimit.globalBurstWindowSec),
    );
    if (result === 0) {
      const b = mb();
      const endpoint = (request.url || '/').split('?')[0];
      const blockKey = `rate_limit:blocks:${endpoint}:${b}`;
      redis.incr(blockKey).then(() => redis.expire(blockKey, 7200)).catch(() => {});
      reply.status(429).header('retry-after', String(config.rateLimit.globalBurstWindowSec)).send({
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: config.rateLimit.globalBurstWindowSec,
      });
      return;
    }
  });

  await fastify.register(rateLimit, {
    redis,
    max: config.rateLimit.globalMaxPerMinute,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      if ((request as any).userId) {
        return `user:${(request as any).userId}`;
      }
      return request.ip;
    },
    errorResponseBuilder: (_request, context) => {
      const retryAfter = Math.ceil((context.ttl ?? 60000) / 1000);
      return {
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      };
    },
    skipOnError: true,
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
});
