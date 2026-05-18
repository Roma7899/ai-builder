import type Redis from 'ioredis';
import { SSEConnectionTracker } from './sse';
import { RedisHealthMonitor } from './redis';
import { LLMCostMonitor } from './llm';
import { AuthMonitor } from './auth';

export interface Alert {
  id: string;
  type: string;
  severity: 'WARN' | 'CRITICAL';
  reason: string;
  affectedArea: string;
  timestamp: string;
  resolvedAt?: string;
}

const COOLDOWN_SEC = 300;
const ESCALATION_SEC = 600;

function ts(): string { return new Date().toISOString(); }
function bucket(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}`;
}
function cooldownKey(type: string, severity: string): string { return `alert:cooldown:${type}:${severity}`; }
function activeKey(type: string, severity: string): string { return `alert:active:${type}:${severity}`; }

export class AlertEngine {

  static async evaluateAlerts(redis: Redis): Promise<Alert[]> {
    const fired: Alert[] = [];

    const [sseMetrics, redisHealth, llmMetrics, authMetrics] = await Promise.all([
      SSEConnectionTracker.getSSEMetrics(redis),
      RedisHealthMonitor.getHealth(redis),
      LLMCostMonitor.getLLMMetrics(redis),
      AuthMonitor.getMetrics(redis),
    ]);

    const sseActive = (sseMetrics.activeConnections as number) ?? 0;
    if (sseActive > 1500) fired.push({ id: '', type: 'sse_connections', severity: 'CRITICAL', reason: `SSE connections at ${sseActive} (threshold 1500)`, affectedArea: 'sse', timestamp: ts() });
    else if (sseActive > 1000) fired.push({ id: '', type: 'sse_connections', severity: 'WARN', reason: `SSE connections at ${sseActive} (threshold 1000)`, affectedArea: 'sse', timestamp: ts() });

    const memPercent = redisHealth.memory.usedBytes > 0 ? (redisHealth.memory.usedBytes / (redisHealth.memory.peakBytes || 1)) * 100 : 0;
    if (memPercent > 85) fired.push({ id: '', type: 'redis_memory', severity: 'CRITICAL', reason: `Redis memory at ${Math.round(memPercent)}% (threshold 85%)`, affectedArea: 'redis', timestamp: ts() });
    else if (memPercent > 70) fired.push({ id: '', type: 'redis_memory', severity: 'WARN', reason: `Redis memory at ${Math.round(memPercent)}% (threshold 70%)`, affectedArea: 'redis', timestamp: ts() });

    const failureRate = (authMetrics.failureRate as number) ?? 0;
    if (failureRate > 10) fired.push({ id: '', type: 'auth_failures', severity: 'CRITICAL', reason: `Auth failure rate at ${failureRate}% (threshold 10%)`, affectedArea: 'auth', timestamp: ts() });

    const spikeRatio = (llmMetrics.spikeRatio as number) ?? 0;
    if (spikeRatio > 3) fired.push({ id: '', type: 'llm_cost', severity: 'CRITICAL', reason: `LLM cost spike at ${spikeRatio}x baseline (threshold 3x)`, affectedArea: 'llm', timestamp: ts() });
    else if (spikeRatio > 2) fired.push({ id: '', type: 'llm_cost', severity: 'WARN', reason: `LLM cost spike at ${spikeRatio}x baseline (threshold 2x)`, affectedArea: 'llm', timestamp: ts() });

    return AlertEngine._processAlerts(redis, fired);
  }

  private static async _processAlerts(redis: Redis, fired: Alert[]): Promise<Alert[]> {
    const results: Alert[] = [];
    const nowBucket = bucket();

    const activeAlerts = new Map<string, { severity: string; firstSeen: string }>();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'alert:active:*', 'COUNT', 200);
      cursor = nextCursor;
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const parts = key.split(':');
            const alertType = parts[2];
            const alertSev = parts[3];
            activeAlerts.set(`${alertType}:${alertSev}`, { severity: alertSev, firstSeen: data.firstSeen });
          } catch { /* skip corrupt */ }
        }
      }
    } while (cursor !== '0');

    for (const alert of fired) {
      const dedupKey = `${alert.type}:${alert.severity}`;
      const ck = cooldownKey(alert.type, alert.severity);
      const ak = activeKey(alert.type, alert.severity);

      const existing = activeAlerts.get(dedupKey);
      if (existing) {
        const firstSeen = new Date(existing.firstSeen).getTime();
        const now = Date.now();
        if (existing.severity === 'WARN' && alert.severity === 'CRITICAL' && (now - firstSeen) >= (ESCALATION_SEC * 1000)) {
          const escalated: Alert = { ...alert, id: `alert:${now}:${Math.random().toString(36).slice(2, 8)}`, severity: 'CRITICAL' };
          await redis.set(ak, JSON.stringify({ ...escalated, firstSeen: ts() }), 'EX', 86400);
          await redis.expire(cooldownKey(alert.type, 'CRITICAL'), COOLDOWN_SEC);
          await AlertEngine._storeHistory(redis, nowBucket, escalated);
          results.push(escalated);
        }
        continue;
      }

      const cooldownVal = await redis.get(ck);
      if (cooldownVal) continue;

      alert.id = `alert:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

      await redis.set(ak, JSON.stringify({ ...alert, firstSeen: ts() }), 'EX', 86400);
      await redis.set(ck, '1', 'EX', COOLDOWN_SEC);
      await AlertEngine._storeHistory(redis, nowBucket, alert);
      results.push(alert);
    }

    const resolved: Alert[] = [];
    const firedKeys = new Set(fired.map(a => `${a.type}:${a.severity}`));
    for (const [key, data] of activeAlerts) {
      if (!firedKeys.has(key)) {
        const parts = key.split(':');
        const ak = activeKey(parts[0], parts[1]);
        const resolvedAlert: Alert = {
          id: `resolved:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          type: parts[0],
          severity: data.severity as 'WARN' | 'CRITICAL',
          reason: `Resolved — no longer firing`,
          affectedArea: parts[0],
          timestamp: data.firstSeen,
          resolvedAt: ts(),
        };
        await redis.del(ak);
        await AlertEngine._storeHistory(redis, nowBucket, resolvedAlert);
        resolved.push(resolvedAlert);
      }
    }

    return results;
  }

  private static async _storeHistory(redis: Redis, bucket: string, alert: Alert): Promise<void> {
    const key = `alerts:history:${bucket}`;
    const multi = redis.multi();
    multi.lpush(key, JSON.stringify(alert));
    multi.ltrim(key, 0, 999);
    multi.expire(key, 86400 * 3);
    await multi.exec();
  }

  static async getActiveAlerts(redis: Redis): Promise<Alert[]> {
    const alerts: Alert[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'alert:active:*', 'COUNT', 200);
      cursor = nextCursor;
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          try { alerts.push(JSON.parse(raw)); } catch { /* skip */ }
        }
      }
    } while (cursor !== '0');
    return alerts;
  }

  static async getAlertTimeline(redis: Redis, minutes = 30): Promise<Alert[]> {
    const bucketKeys: string[] = [];
    const now = new Date();
    for (let m = 0; m <= minutes; m++) {
      const d = new Date(now.getTime() - m * 60000);
      bucketKeys.push(`alerts:history:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}`);
    }
    const unique = [...new Set(bucketKeys)];
    const allRaw = await Promise.all(unique.map(k => redis.lrange(k, 0, -1)));
    const alerts: Alert[] = [];
    for (const raw of allRaw.flat()) {
      try { alerts.push(JSON.parse(raw)); } catch { /* skip */ }
    }
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const cutoff = now.getTime() - minutes * 60000;
    return alerts.filter(a => new Date(a.timestamp).getTime() >= cutoff).slice(0, 100);
  }

  static inferRootCause(redis: Redis, snapshot: Record<string, unknown>): string[] {
    const causes: string[] = [];
    const sseActive = (snapshot as any)?.sse?.activeConnections ?? 0;
    const redisLatency = (snapshot as any)?.redis?.pingLatencyMs ?? 0;
    const llmSpike = (snapshot as any)?.cost?.llmSpikeRatio ?? 0;
    const authFailureRate = (snapshot as any)?.auth?.failureRate ?? 0;
    if (sseActive > 1000) causes.push('Traffic surge — high SSE connections');
    if (redisLatency > 100) causes.push('Infrastructure pressure — high Redis latency');
    if (llmSpike > 2) causes.push('AI workload surge — LLM cost spike');
    if (authFailureRate > 10) causes.push('Attack or outage — auth failure spike');
    if (causes.length === 0) causes.push('No root cause identified');
    return causes;
  }
}
