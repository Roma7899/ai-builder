import type Redis from 'ioredis';

export interface TraceData {
  userId: string;
  endpoint: string;
  metrics: {
    latencyMs: number;
    llmCalls: number;
    redisCalls: number;
    costCents: number;
  };
}

const CORRELATION_PREFIX = 'metrics:trace:';
const CORRELATION_TTL = 3600;

export class CorrelationEngine {

  static async writeTrace(redis: Redis, requestId: string, data: Partial<TraceData>): Promise<void> {
    if (!requestId) return;
    const key = `${CORRELATION_PREFIX}${requestId}`;
    const multi = redis.multi();
    multi.hset(key, 'userId', data.userId || '');
    multi.hset(key, 'endpoint', data.endpoint || '');
    multi.hset(key, 'timestamp', new Date().toISOString());
    multi.expire(key, CORRELATION_TTL);

    if (data.metrics) {
      if (data.metrics.latencyMs) multi.hincrby(key, 'latencyMs', Math.round(data.metrics.latencyMs));
      if (data.metrics.llmCalls) multi.hincrby(key, 'llmCalls', data.metrics.llmCalls);
      if (data.metrics.redisCalls) multi.hincrby(key, 'redisCalls', data.metrics.redisCalls);
      if (data.metrics.costCents) multi.hincrbyfloat(key, 'costCents', data.metrics.costCents);
    }
    await multi.exec();
  }

  static async getTrace(redis: Redis, requestId: string): Promise<TraceData | null> {
    const raw = await redis.hgetall(`${CORRELATION_PREFIX}${requestId}`);
    if (!raw || Object.keys(raw).length === 0) return null;
    return {
      userId: raw.userId || '',
      endpoint: raw.endpoint || '',
      metrics: {
        latencyMs: Number(raw.latencyMs) || 0,
        llmCalls: Number(raw.llmCalls) || 0,
        redisCalls: Number(raw.redisCalls) || 0,
        costCents: Number(raw.costCents) || 0,
      },
    };
  }

  static async getRecentTraceCount(redis: Redis, minutes = 5): Promise<number> {
    const cutoff = Date.now() - minutes * 60000;
    let count = 0;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${CORRELATION_PREFIX}*`, 'COUNT', 500);
      cursor = nextCursor;
      if (keys.length > 0) {
        const timestamps = await redis.mget(...keys.map(k => k));
        for (const ts of timestamps) {
          if (ts && new Date(ts).getTime() >= cutoff) count++;
        }
      }
    } while (cursor !== '0');
    return count;
  }
}
