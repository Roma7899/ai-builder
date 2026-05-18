import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

export default async function (fastify: FastifyInstance) {
  const service = new ExportService(fastify.prisma);
  const controller = new ExportController(service);

  fastify.get('/projects/:id', { preHandler: [authenticate, rls] }, controller.generateExport);
}
