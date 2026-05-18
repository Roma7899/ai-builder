import type { FastifyRequest, FastifyReply } from 'fastify';
import { DomainsService } from './domains.service';
import { AppError } from '../auth/auth.service';

export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  addDomain = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { domain } = request.body as { domain: string };

    try {
      const result = await this.domainsService.addDomain(id, request.userId, domain);
      return reply.status(201).send(result);
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  verifyDomain = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await this.domainsService.verifyDomain(id, request.userId);
      return reply.send(result);
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
