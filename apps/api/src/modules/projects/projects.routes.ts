import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

export default async function (fastify: FastifyInstance) {
  const service = new ProjectsService(fastify.prisma);
  const controller = new ProjectsController(service);

  fastify.get('/', { preHandler: [authenticate, rls] }, controller.findAll);
  fastify.post('/', { preHandler: [authenticate, rls] }, controller.create);
  fastify.put('/:id', { preHandler: [authenticate, rls] }, controller.update);
  fastify.delete('/:id', { preHandler: [authenticate, rls] }, controller.delete);
}
