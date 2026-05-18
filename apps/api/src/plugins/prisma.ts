import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getPrisma } from '../lib/createWorker';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: import('@prisma/client').PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const prisma = getPrisma();
  fastify.decorate('prisma', prisma);
});
