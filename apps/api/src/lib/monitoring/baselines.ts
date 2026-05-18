import type Redis from 'ioredis';

const EMA_ALPHA = 0.2;
const BASELINE_PREFIX = 'baseline';

function minuteBucket(offset = 0): string {
  const n = new Date(Date.now() - offset * 60000);
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

export class Baselines {

  static async updateBaseline(redis: Redis, metric: string, value: number, window: string): Promise<void> {
    const rawKey = `${BASELINE_PREFIX}:${metric}:${window}:raw`;
    const emaKey = `${BASELINE_PREFIX}:${metric}:${window}:ema`;
    const countKey = `${BASELINE_PREFIX}:${metric}:${window}:count`;

    const multi = redis.multi();
    multi.incrbyfloat(rawKey, value);
    multi.incr(countKey);
    const results = await multi.exec();
    const raw = Number((results?.[0]?.[1] as string) ?? '0');
    const count = Number((results?.[1]?.[1] ?? '0'));

    if (count === 1) {
      const avg = raw / count;
      const emaVal = avg;
      const ttl = Baselines._ttlForWindow(window);
      const multi2 = redis.multi();
      multi2.set(emaKey, String(emaVal), 'EX', ttl);
      multi2.expire(rawKey, ttl);
      multi2.expire(countKey, ttl);
      await multi2.exec();
    } else {
      const oldEmaRaw = await redis.get(emaKey);
      if (oldEmaRaw) {
        const oldEma = Number(oldEmaRaw);
        const newEma = EMA_ALPHA * value + (1 - EMA_ALPHA) * oldEma;
        const ttl = Baselines._ttlForWindow(window);
        await redis.set(emaKey, String(newEma), 'EX', ttl);
        await redis.expire(rawKey, ttl);
        await redis.expire(countKey, ttl);
      }
    }
  }

  static async getBaseline(redis: Redis, metric: string, window: string): Promise<{ ema: number; raw: number; count: number }> {
    const [emaRaw, rawRaw, countRaw] = await Promise.all([
      redis.get(`${BASELINE_PREFIX}:${metric}:${window}:ema`),
      redis.get(`${BASELINE_PREFIX}:${metric}:${window}:raw`),
      redis.get(`${BASELINE_PREFIX}:${metric}:${window}:count`),
    ]);
    return { ema: Number(emaRaw) || 0, raw: Number(rawRaw) || 0, count: Number(countRaw) || 0 };
  }

  private static _ttlForWindow(window: string): number {
    if (window.endsWith('m')) {
      const min = parseInt(window, 10);
      return (min + 5) * 60;
    }
    if (window.endsWith('h')) {
      const h = parseInt(window, 10);
      return (h + 1) * 3600;
    }
    return 7200;
  }
}
