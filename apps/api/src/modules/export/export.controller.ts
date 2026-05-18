import type { FastifyRequest, FastifyReply } from 'fastify';
import { ExportService } from './export.service';
import { AppError } from '../auth/auth.service';

export class ExportController {
  constructor(private exportService: ExportService) {}

  generateExport = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const downloadUrl = await this.exportService.generateExportZip(id, request.userId);
      return reply.send({ downloadUrl });
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
