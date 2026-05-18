import type Redis from 'ioredis';
import { Baselines } from './baselines';

const SSE_ACTIVE = 'sse:active';
const SSE_DROPS_BUCKET = 'sse:drops';
const SSE_USER_PREFIX = 'sse:user:';
const SSE_MAX_CONCURRENT = 'sse:max:concurrent';

function minuteBucket(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

export class SSEConnectionTracker {

  static async onConnect(redis: Redis, userId: string): Promise<void> {
    const multi = redis.multi();
    multi.incr(SSE_ACTIVE);
    multi.incr(`${SSE_USER_PREFIX}${userId}`);
    multi.expire(`${SSE_USER_PREFIX}${userId}`, 86400);
    const cur = await multi.exec();
    const active = (cur?.[0]?.[1] as number) ?? 0;
    const max = await redis.get(SSE_MAX_CONCURRENT);
    if (active > (Number(max) || 0)) {
      await redis.set(SSE_MAX_CONCURRENT, active);
    }

    Baselines.updateBaseline(redis, 'sse', active, '5m').catch(() => {});
    Baselines.updateBaseline(redis, 'sse', active, '30m').catch(() => {});
  }

  static async onDisconnect(redis: Redis, userId: string): Promise<void> {
    const multi = redis.multi();
    multi.decr(SSE_ACTIVE);
    multi.decr(`${SSE_USER_PREFIX}${userId}`);
    multi.expire(`${SSE_USER_PREFIX}${userId}`, 86400);
    await multi.exec();
  }

  static async recordDrop(redis: Redis): Promise<void> {
    const key = `${SSE_DROPS_BUCKET}:${minuteBucket()}`;
    await redis.incr(key);
    await redis.expire(key, 7200);
  }

  static async getActiveConnections(redis: Redis): Promise<number> {
    const raw = await redis.get(SSE_ACTIVE);
    return Number(raw) || 0;
  }

  static async getUserConnectionCount(redis: Redis, userId: string): Promise<number> {
    const raw = await redis.get(`${SSE_USER_PREFIX}${userId}`);
    return Number(raw) || 0;
  }

  static async getMaxConcurrent(redis: Redis): Promise<number> {
    const raw = await redis.get(SSE_MAX_CONCURRENT);
    return Number(raw) || 0;
  }

  static async getDropRate(redis: Redis): Promise<{ dropsLastMin: number; dropsLast5Min: number; dropsLastHr: number }> {
    const now = new Date();
    const buckets: string[] = [];
    for (let m = 0; m < 60; m++) {
      const d = new Date(now.getTime() - m * 60000);
      buckets.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    }
    const keys = buckets.map(b => `${SSE_DROPS_BUCKET}:${b}`);
    const values = await redis.mget(...keys);
    let dropsLastMin = 0, dropsLast5Min = 0, dropsLastHr = 0;
    for (let i = 0; i < values.length; i++) {
      const v = Number(values[i]) || 0;
      if (i === 0) dropsLastMin = v;
      if (i < 5) dropsLast5Min += v;
      dropsLastHr += v;
    }
    return { dropsLastMin, dropsLast5Min, dropsLastHr };
  }

  static async getSSEMetrics(redis: Redis): Promise<Record<string, unknown>> {
    const [active, maxConcurrent, userConnections, dropRate] = await Promise.all([
      SSEConnectionTracker.getActiveConnections(redis),
      SSEConnectionTracker.getMaxConcurrent(redis),
      SSEConnectionTracker.getTopUsers(redis, 10),
      SSEConnectionTracker.getDropRate(redis),
    ]);
    return { activeConnections: active, maxConcurrent, topUsers: userConnections, dropRate };
  }

  static async getTopUsers(redis: Redis, limit = 10): Promise<Array<{ userId: string; count: number }>> {
    let cursor = '0';
    const results: Array<{ userId: string; count: number }> = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${SSE_USER_PREFIX}*`, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const v = Number(values[i]) || 0;
          if (v > 0) {
            results.push({ userId: keys[i].slice(SSE_USER_PREFIX.length), count: v });
          }
        }
      }
    } while (cursor !== '0');
    results.sort((a, b) => b.count - a.count);
    return results.slice(0, limit);
  }
}
