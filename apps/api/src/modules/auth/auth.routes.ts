import type { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { authenticate } from '../../middleware/authenticate';

export default async function (fastify: FastifyInstance) {
  const service = new AuthService(fastify.prisma, fastify.redis);
  const controller = new AuthController(service);

  fastify.post('/register', {
    config: {
      rateLimit: { max: 5, timeWindow: '10 minutes' },
    },
  }, controller.register);
  fastify.post('/login', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  }, controller.login);
  fastify.post('/refresh', {
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
  }, controller.refresh);
  fastify.post('/logout', { preHandler: [authenticate] }, controller.logout);
  fastify.get('/google', controller.googleStub);
  fastify.get('/google/callback', controller.googleCallbackStub);
}
