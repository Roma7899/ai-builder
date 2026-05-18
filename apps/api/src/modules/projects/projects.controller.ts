import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service';
import { createProjectSchema, updateProjectSchema } from './projects.schema';
import { AppError } from '../auth/auth.service';

export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  findAll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const projects = await this.projectsService.findAll(request.userId);
      return reply.send(projects);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const project = await this.projectsService.create(request.userId, parsed.data.name);
      return reply.status(201).send(project);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const { id } = request.params as { id: string };

    try {
      const project = await this.projectsService.update(request.userId, id, parsed.data.name);
      return reply.send(project);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await this.projectsService.delete(request.userId, id);
      return reply.status(204).send();
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  private handleError(reply: FastifyReply, err: unknown) {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
