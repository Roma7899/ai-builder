import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    reqLogger: FastifyInstance['log'];
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request) => {
    request.requestId = (request.headers['x-request-id'] as string) || randomUUID();
    request.reqLogger = request.log.child({ requestId: request.requestId });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    if (request.reqLogger) {
      const userId = (request as any).userId || 'unauthenticated';
      request.reqLogger.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        userId,
      }, 'request completed');
    }
  });
});
