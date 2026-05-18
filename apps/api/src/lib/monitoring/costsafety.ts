import type Redis from 'ioredis';
import { Baselines } from './baselines';
import { CorrelationEngine } from './correlation';

const COST_FLAG_PREFIX = 'cost:flag:';
const USER_COST_KEY = 'cost:user:';
const USER_COST_THRESHOLD_CENTS = 2000;
const SAMPLE_RATE_KEY = 'cost:sample:rate';

export class CostSafety {

  static async checkSample(redis: Redis): Promise<boolean> {
    try {
      const rps = await CorrelationEngine.getRecentTraceCount(redis, 1);
      if (rps > 100) {
        const sampleRate = 0.05;
        await redis.set(SAMPLE_RATE_KEY, String(sampleRate));
        return Math.random() < sampleRate;
      }
      if (rps > 50) {
        const sampleRate = 0.5;
        await redis.set(SAMPLE_RATE_KEY, String(sampleRate));
        return Math.random() < sampleRate;
      }
      return true;
    } catch { return true; }
  }

  static async checkUserCostFlag(redis: Redis, userId: string): Promise<boolean> {
    try {
      const raw = await redis.get(`${COST_FLAG_PREFIX}${userId}`);
      return raw === '1';
    } catch { return false; }
  }

  static async updateUserCost(redis: Redis, userId: string, costCents: number): Promise<void> {
    if (!userId) return;
    const key = `${USER_COST_KEY}${userId}`;
    const multi = redis.multi();
    multi.incrbyfloat(key, costCents);
    multi.expire(key, 86400);

    const flagged = await CostSafety.checkUserCostFlag(redis, userId);
    if (!flagged) {
      const raw = await redis.get(key);
      const total = Number(raw) || 0;
      if (total > USER_COST_THRESHOLD_CENTS) {
        multi.set(`${COST_FLAG_PREFIX}${userId}`, '1', 'EX', 3600);
      }
    }
    await multi.exec();
  }

  static async checkCostAnomaly(redis: Redis, currentCostCents: number): Promise<{ anomaly: boolean; ratio: number }> {
    const baseline = await Baselines.getBaseline(redis, 'llm', '1h');
    if (baseline.ema <= 0 || baseline.count < 3) return { anomaly: false, ratio: 0 };
    const ratio = baseline.ema > 0 ? currentCostCents / baseline.ema : 0;
    return { anomaly: ratio > 2, ratio: Math.round(ratio * 100) / 100 };
  }
}
