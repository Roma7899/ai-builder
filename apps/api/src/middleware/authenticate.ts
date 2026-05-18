import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { AuthMonitor } from '../lib/monitoring/auth';
import { getRedis } from '../lib/redisFactory';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const publicKey = (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n');

  try {
    // Phase 1: accept tokens with or without aud/iss (zero-downtime migration).
    // TODO Phase 2: enforce issuer: 'ai-builder', audience: ['api', 'renderer-session']
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as { sub: string };
    request.userId = payload.sub;
    if (request.reqLogger) {
      request.reqLogger = request.reqLogger.child({ userId: payload.sub });
    }
  } catch {
    AuthMonitor.recordTokenFailure(getRedis()).catch(() => {});
    reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
