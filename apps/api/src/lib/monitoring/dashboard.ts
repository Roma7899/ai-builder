import type Redis from 'ioredis';
import { SSEConnectionTracker } from './sse';
import { RedisHealthMonitor, type RedisHealthResult } from './redis';
import { LLMCostMonitor, type LLMCostResult } from './llm';
import { AuthMonitor } from './auth';
import { ErrorGrouper, type ErrorGroup } from './errors';
import { CostAlertManager, type CostAlert } from './costAlerts';
import { AlertEngine, type Alert } from './engine';
import { getMetricsSnapshot } from '../metrics';
import { getRegionQueueName } from '../createWorker';
import { generationQueue } from '../../modules/generation/generation.service';
import { publishQueue } from '../../modules/publish/publish.service';

export interface DashboardData {
  systemHealth: {
    uptimeSeconds: string;
    status: string;
  };
  sse: {
    activeConnections: number;
    maxConcurrent: number;
    dropsLastMin: number;
    dropsLast5Min: number;
  };
  redis: RedisHealthResult | null;
  apiLatency: {
    p50Ms: number;
    p99Ms: number;
    recentAvgMs: number;
  };
  usage: {
    activeUsers: number;
    requestsPerMin: number;
    generationCount: number;
    publishCount: number;
    queueDepth: Record<string, number>;
    queuePressure: Record<string, string>;
    rateLimitBlocks: Record<string, number>;
  };
  cost: {
    llmSpendTodayCents: number;
    costPerUser: Array<{ userId: string; costCents: number }>;
    topEndpoints: Array<{ endpoint: string; costCents: number }>;
    costSafetyFlags: number;
  };
  errors: {
    topErrors: ErrorGroup[];
    recentErrors: Array<{ hash: string; message: string; endpoint: string; timestamp: string }>;
  };
  auth: Record<string, unknown>;
  incidents: {
    active: Alert[];
    timeline: Alert[];
    rootCauses: string[];
  };
  alerts: Array<{
    type: string;
    severity: string;
    reason: string;
    timestamp: string;
  }>;
}

export class DashboardAggregator {

  static async getDashboardData(redis: Redis): Promise<DashboardData> {
    const [sseMetrics, redisHealth, llmMetrics, authMetrics, errors, costAlerts, apiLatency, queueInfo, activeIncidents, alertTimeline, dailyCost, flagsCount, rlBlocks] = await Promise.all([
      DashboardAggregator._getSSE(redis),
      RedisHealthMonitor.getHealth(redis),
      LLMCostMonitor.getLLMMetrics(redis),
      AuthMonitor.getMetrics(redis),
      DashboardAggregator._getErrors(redis),
      CostAlertManager.getRecentAlerts(redis),
      DashboardAggregator._getAPILatency(redis),
      DashboardAggregator._getQueueInfo(),
      AlertEngine.getActiveAlerts(redis),
      AlertEngine.getAlertTimeline(redis, 30),
      CostAlertManager.getDailyCost(redis),
      DashboardAggregator._getFlagsCount(redis),
      DashboardAggregator._getRateLimitBlocks(redis),
    ]);

    const snapshot: Record<string, unknown> = {
      sse: sseMetrics,
      redis: redisHealth,
      cost: { llmSpikeRatio: (llmMetrics.spikeRatio as number) ?? 0 },
      auth: authMetrics,
    };

    const rootCauses = AlertEngine.inferRootCause(redis, snapshot);

    return {
      systemHealth: {
        uptimeSeconds: String(redisHealth?.uptimeSeconds ?? ''),
        status: redisHealth?.connected ? 'healthy' : 'degraded',
      },
      sse: {
        activeConnections: (sseMetrics.activeConnections as number) ?? 0,
        maxConcurrent: (sseMetrics.maxConcurrent as number) ?? 0,
        dropsLastMin: ((sseMetrics.dropRate as any)?.dropsLastMin as number) ?? 0,
        dropsLast5Min: ((sseMetrics.dropRate as any)?.dropsLast5Min as number) ?? 0,
      },
      redis: redisHealth,
      apiLatency,
      usage: {
        activeUsers: (authMetrics as any).totalAttempts ?? 0,
        requestsPerMin: apiLatency.recentAvgMs > 0 ? Math.round(60000 / (apiLatency.recentAvgMs || 1)) : 0,
        generationCount: queueInfo.generationCount,
        publishCount: queueInfo.publishCount,
        queueDepth: queueInfo.depth,
        queuePressure: queueInfo.pressure,
        rateLimitBlocks: rlBlocks,
      },
      cost: {
        llmSpendTodayCents: Math.round(dailyCost * 100) / 100,
        costPerUser: (llmMetrics.costPerUser as Array<{ userId: string; costCents: number }>) ?? [],
        topEndpoints: (llmMetrics.costPerEndpoint as Array<{ endpoint: string; costCents: number }>) ?? [],
        costSafetyFlags: flagsCount,
      },
      errors,
      auth: authMetrics,
      incidents: {
        active: activeIncidents,
        timeline: alertTimeline,
        rootCauses,
      },
      alerts: activeIncidents.map(a => ({
        type: a.type,
        severity: a.severity,
        reason: a.reason,
        timestamp: a.timestamp,
      })),
    };
  }

  private static async _getSSE(redis: Redis): Promise<Record<string, unknown>> {
    return SSEConnectionTracker.getSSEMetrics(redis);
  }

  private static async _getErrors(redis: Redis): Promise<{ topErrors: ErrorGroup[]; recentErrors: Array<{ hash: string; message: string; endpoint: string; timestamp: string }> }> {
    const [topErrors, recentErrors] = await Promise.all([
      ErrorGrouper.getTopErrors(redis, 10),
      ErrorGrouper.getRecentErrors(redis, 10),
    ]);
    return { topErrors, recentErrors };
  }

  private static async _getAPILatency(redis: Redis): Promise<{ p50Ms: number; p99Ms: number; recentAvgMs: number }> {
    const mb = DashboardAggregator._minuteBucket();
    const latencies: number[] = [];
    for (let m = 0; m < 5; m++) {
      const d = new Date(Date.now() - m * 60000);
      const b = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const raw = await redis.lrange(`api:latency:${b}`, 0, -1);
      for (const r of raw) {
        const v = Number(r);
        if (v > 0) latencies.push(v);
      }
    }
    if (latencies.length === 0) return { p50Ms: 0, p99Ms: 0, recentAvgMs: 0 };
    latencies.sort((a, b) => a - b);
    const len = latencies.length;
    const p50 = latencies[Math.floor(len * 0.5)];
    const p99 = latencies[Math.floor(len * 0.99)];
    const avg = latencies.reduce((a, b) => a + b, 0) / len;
    return { p50Ms: p50, p99Ms: p99, recentAvgMs: Math.round(avg) };
  }

  private static async _getQueueInfo(): Promise<{ generationCount: number; publishCount: number; depth: Record<string, number>; pressure: Record<string, string> }> {
    const generateQueueName = getRegionQueueName('generate');
    const publishQueueName = getRegionQueueName('publish');
    const [genActive, genWaiting, genDelayed, pubActive, pubWaiting, pubDelayed] = await Promise.all([
      generationQueue.getActiveCount(),
      generationQueue.getWaitingCount(),
      generationQueue.getDelayedCount(),
      publishQueue.getActiveCount(),
      publishQueue.getWaitingCount(),
      publishQueue.getDelayedCount(),
    ]);
    return {
      generationCount: genActive + genWaiting + genDelayed,
      publishCount: pubActive + pubWaiting + pubDelayed,
      depth: { [generateQueueName]: genActive + genWaiting + genDelayed, [publishQueueName]: pubActive + pubWaiting + pubDelayed },
      pressure: {
        [generateQueueName]: genActive > 5 || genWaiting > 20 ? 'high' : genActive > 2 || genWaiting > 10 ? 'medium' : 'low',
        [publishQueueName]: pubActive > 5 || pubWaiting > 20 ? 'high' : pubActive > 2 || pubWaiting > 10 ? 'medium' : 'low',
      },
    };
  }

  private static async _getFlagsCount(redis: Redis): Promise<number> {
    let count = 0;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'cost:flag:*', 'COUNT', 200);
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');
    return count;
  }

  private static async _getRateLimitBlocks(redis: Redis): Promise<Record<string, number>> {
    const mb = DashboardAggregator._minuteBucket();
    const blocks: Record<string, number> = {};
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `rate_limit:blocks:*:${mb}`, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const v = Number(values[i]) || 0;
          if (v > 0) {
            const endpoint = keys[i].split(':')[2];
            blocks[endpoint] = (blocks[endpoint] || 0) + v;
          }
        }
      }
    } while (cursor !== '0');
    return blocks;
  }

  private static _minuteBucket(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  }
}
