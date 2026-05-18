import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getRedis } from '../lib/redisFactory';

declare module 'fastify' {
  interface FastifyInstance {
    redis: import('ioredis').Redis;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = getRedis();
  fastify.decorate('redis', redis);
  fastify.addHook('onClose', async (_instance) => {
    // redisFactory manages lifecycle — do not quit here
  });
});
