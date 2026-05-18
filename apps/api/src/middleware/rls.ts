import type { FastifyRequest, FastifyReply } from 'fastify';

// Defense-in-depth: PostgreSQL session-level RLS context.
// Primary tenant isolation is enforced via withRls() inside transactions.
// This middleware ensures RLS context exists even if a query leaks outside a transaction.
// Errors are intentionally swallowed because withRls() is the authoritative isolation layer.

export async function rls(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.userId) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  try {
    await (request.server.prisma as any).$executeRaw`SELECT set_config('app.current_user_id', ${request.userId}::text, true)`;
  } catch (err) {
    request.server.log.error({ err, userId: request.userId }, 'RLS middleware set_config failed');
  }
}
