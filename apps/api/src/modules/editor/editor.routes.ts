import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';
import { rls } from '../../middleware/rls';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';

export default async function (fastify: FastifyInstance) {
  const service = new EditorService(fastify.prisma);
  const controller = new EditorController(service);

  const pre = { preHandler: [authenticate, rls] };

  fastify.get('/projects/:id', pre, controller.getProjectData);
  fastify.patch('/projects/:id', { ...pre, bodyLimit: 1048576 }, controller.saveSiteVersion);
  fastify.post('/projects/:id/sections', pre, controller.addSection);
  fastify.delete('/projects/:id/sections/:sectionId', pre, controller.deleteSection);
  fastify.patch('/projects/:id/sections/reorder', pre, controller.reorderSections);
  fastify.post('/projects/:id/sections/:sectionId/regenerate', pre, controller.regenerateSection);
  fastify.get('/projects/:id/versions', pre, controller.listVersions);
  fastify.post('/projects/:id/versions/:v/restore', pre, controller.restoreVersion);
}
