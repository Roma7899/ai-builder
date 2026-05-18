import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SSEConnectionTracker } from '../../lib/monitoring/sse';
import { RedisHealthMonitor } from '../../lib/monitoring/redis';
import { LLMCostMonitor } from '../../lib/monitoring/llm';
import { AuthMonitor } from '../../lib/monitoring/auth';
import { ErrorGrouper } from '../../lib/monitoring/errors';
import { CostAlertManager } from '../../lib/monitoring/costAlerts';
import { AlertEngine } from '../../lib/monitoring/engine';
import { Baselines } from '../../lib/monitoring/baselines';

export default async function (fastify: FastifyInstance) {
  const redis = fastify.redis;

  fastify.get('/metrics/sse', async (_request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await SSEConnectionTracker.getSSEMetrics(redis);
    const active = (metrics.activeConnections as number) ?? 0;

    const alerts: string[] = [];
    if (active >= 1500) alerts.push('CRITICAL: 1500+ concurrent SSE connections');
    else if (active >= 1000) alerts.push('WARN: 1000+ concurrent SSE connections');

    return reply.send({ ...metrics, alerts });
  });

  fastify.get('/metrics/redis', async (_request: FastifyRequest, reply: FastifyReply) => {
    const health = await RedisHealthMonitor.getHealth(redis);
    const alerts: string[] = [];
    if (health.memory.usedBytes > 0) {
      const memPercent = health.memory.usedBytes / (health.memory.peakBytes || 1) * 100;
      if (memPercent > 85) alerts.push('CRITICAL: Redis memory > 85%');
      else if (memPercent > 70) alerts.push('WARNING: Redis memory > 70%');
    }
    return reply.send({ ...health, alerts });
  });

  fastify.get('/metrics/llm', async (_request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await LLMCostMonitor.getLLMMetrics(redis);
    const alerts: string[] = [];
    if (metrics.anomalyDetected) alerts.push(`WARN: LLM cost spike detected (${metrics.spikeRatio}x baseline)`);
    return reply.send({ ...metrics, alerts });
  });

  fastify.get('/metrics/auth', async (_request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await AuthMonitor.getMetrics(redis);
    const alerts: string[] = [];
    if ((metrics.failureRate as number) > 10) alerts.push('CRITICAL: Auth failure rate > 10%');
    if ((metrics.bruteForceIPs as any[] ?? []).length > 0) alerts.push(`WARN: Brute-force pattern detected — ${(metrics.bruteForceIPs as any[]).length} IPs`);
    return reply.send({ ...metrics, alerts });
  });

  fastify.get('/metrics/errors', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [topErrors, recentErrors] = await Promise.all([
      ErrorGrouper.getTopErrors(redis, 10),
      ErrorGrouper.getRecentErrors(redis, 20),
    ]);
    return reply.send({ topErrors, recentErrors });
  });

  fastify.get('/metrics/cost-alerts', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [alerts, config] = await Promise.all([
      CostAlertManager.getRecentAlerts(redis),
      CostAlertManager.getConfig(redis),
    ]);
    return reply.send({ alerts, config });
  });

  fastify.get('/metrics/alerts', async (_request: FastifyRequest, reply: FastifyReply) => {
    const alerts = await AlertEngine.evaluateAlerts(redis);
    return reply.send({ alerts });
  });

  fastify.get('/metrics/incidents', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [active, timeline] = await Promise.all([
      AlertEngine.getActiveAlerts(redis),
      AlertEngine.getAlertTimeline(redis, 30),
    ]);
    return reply.send({ activeIncidents: active, timeline });
  });

  fastify.get('/metrics/baselines', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [sse5m, sse30m, llm1h, auth1h] = await Promise.all([
      Baselines.getBaseline(redis, 'sse', '5m'),
      Baselines.getBaseline(redis, 'sse', '30m'),
      Baselines.getBaseline(redis, 'llm', '1h'),
      Baselines.getBaseline(redis, 'auth', '1h'),
    ]);
    return reply.send({ sse5m, sse30m, llm1h, auth1h });
  });
}
