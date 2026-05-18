import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';

export default async function (fastify: FastifyInstance) {
  const service = new DomainsService(fastify.prisma);
  const controller = new DomainsController(service);

  const pre = { preHandler: [authenticate, rls] };

  fastify.post('/projects/:id', pre, controller.addDomain);
  fastify.get('/projects/:id/verify', pre, controller.verifyDomain);
}
