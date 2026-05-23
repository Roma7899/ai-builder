import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import loggerPlugin from './plugins/logger';
import rateLimiterPlugin from './plugins/rateLimiter';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/projects.routes';
import generationRoutes from './modules/generation/generation.routes';
import rendererRoutes from './modules/renderer/renderer.routes';
import editorRoutes from './modules/editor/editor.routes';
import publishRoutes from './modules/publish/publish.routes';
import domainRoutes from './modules/domains/domains.routes';
import exportRoutes from './modules/export/export.routes';
import systemRoutes from './modules/system/system.routes';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import dashboardRoutes from './modules/monitoring/dashboard.routes';
import { ErrorGrouper } from './lib/monitoring/errors';
import { CorrelationEngine } from './lib/monitoring/correlation';
import { RedisHealthMonitor } from './lib/monitoring/redis';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.passwordHash'],
        censor: '[REDACTED]',
      },
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          requestId: req.requestId,
        }),
      },
    },
  });

  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.register(cookie);
  await app.register(loggerPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

      app.get('/api/health', async () => {
    const start = Date.now();

    const redisOk = await RedisHealthMonitor.getHealth(app.redis).catch(() => null);
    const redisDeps = redisOk ? { ok: redisOk.connected, latencyMs: redisOk.pingLatencyMs } : { ok: false, latencyMs: 0 };

    let dbOk = false;
    let dbQueryTimeMs = 0;
    try {
      const dbStart = Date.now();
      await (app.prisma as any).$queryRawUnsafe('SELECT 1');
      dbQueryTimeMs = Date.now() - dbStart;
      dbOk = true;
    } catch { /* db degraded */ }

    let llmOk = false;
    let llmLatencyMs = 0;
    try {
      const llmStart = Date.now();
      const baseUrl = process.env.LLM_PROVIDER === 'anthropic'
        ? 'https://api.anthropic.com'
        : (process.env.OPENAI_BASE_URL || 'https://api.openai.com');
      const resp = await fetch(baseUrl.replace(/\/+$/, ''), { method: 'HEAD', signal: AbortSignal.timeout(2000) });
      llmLatencyMs = Date.now() - llmStart;
      llmOk = resp.ok || resp.status >= 400;
    } catch { /* llm degraded */ }

    const totalMs = Date.now() - start;
    const degradedServices: string[] = [];
    if (!redisDeps.ok) degradedServices.push('redis');
    if (!dbOk) degradedServices.push('db');
    if (!llmOk) degradedServices.push('llm');

    return {
      status: degradedServices.length === 0 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTimeMs: totalMs,
      dependencies: {
        redis: redisDeps,
        db: { ok: dbOk, queryTimeMs: dbQueryTimeMs },
        llm: { ok: llmOk, latencyMs: llmLatencyMs },
      },
      degradedServices,
    };
  });

  await app.register(rateLimiterPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(generationRoutes, { prefix: '/api/generate' });
  await app.register(rendererRoutes, { prefix: '/api/renderer' });
  await app.register(editorRoutes, { prefix: '/api/editor' });
  await app.register(publishRoutes, { prefix: '/api/publish' });
  await app.register(domainRoutes, { prefix: '/api/domains' });
  await app.register(exportRoutes, { prefix: '/api/export' });
  await app.register(systemRoutes, { prefix: '/api' });
  await app.register(monitoringRoutes, { prefix: '/api' });
  await app.register(dashboardRoutes, { prefix: '/api' });

  app.addHook('onResponse', async (request, reply) => {
    const elapsed = reply.elapsedTime;
    if (elapsed > 0 && elapsed < 60000) {
      const mb = minuteBucket();
      const key = `api:latency:${mb}`;
      try {
        const multi = app.redis.multi();
        multi.lpush(key, Math.round(elapsed));
        multi.ltrim(key, 0, 999);
        multi.expire(key, 7200);
        await multi.exec();
      } catch { /* best-effort */ }
    }

    try {
      const reqId = (request as any).requestId;
      if (reqId) {
        const userId = (request as any).userId || '';
        const url = request.url || '';
        CorrelationEngine.writeTrace(app.redis, reqId, {
          userId,
          endpoint: url.split('?')[0],
          metrics: { latencyMs: elapsed > 0 ? elapsed : 0, llmCalls: 0, redisCalls: 0, costCents: 0 },
        }).catch(() => {});
      }
    } catch { /* best-effort */ }
  });

  app.setErrorHandler((error, request, reply) => {
    const log = (request as any).reqLogger || app.log;
    log.error({ err: error, userId: (request as any).userId }, 'Unhandled error');

    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? (error.stack || '') : '';
    const userId = (request as any).userId || '';
    ErrorGrouper.recordError(app.redis, errMsg, request.url || '', errStack, request.url, userId).catch(() => {});

    const statusCode = (error as any).statusCode ?? 500;
    reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal server error' : errMsg,
      requestId: (request as any).requestId,
    });
  });

  function minuteBucket(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  }

  return app;
}
