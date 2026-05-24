import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate';

export default async function (fastify: FastifyInstance) {
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { image, filename } = request.body as { image?: string; filename?: string };
    if (!image) {
      return reply.status(400).send({ error: 'Missing image data' });
    }
    // Store base64 image — for simplicity, return the base64 as the URL
    // In production, upload to R2/S3
    return reply.send({ url: image, filename: filename || 'image.png' });
  });
}
