import type Redis from 'ioredis';
import { Baselines } from './baselines';
import { CostSafety } from './costsafety';

export interface LLMCostResult {
  costPerMinute: number;
  costPerUser: Array<{ userId: string; costCents: number }>;
  costPerEndpoint: Array<{ endpoint: string; costCents: number }>;
  baselineCostCents: number;
  anomalyDetected: boolean;
  spikeRatio: number;
}

function minuteBucket(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function hourBucket(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}`;
}

const LLM_USER_PREFIX = 'metrics:llm:user:';
const LLM_ENDPOINT_PREFIX = 'metrics:llm:endpoint:';
const LLM_COST_MINUTE = 'metrics:llm:cost_minute';

export class LLMCostMonitor {

  static async recordCost(redis: Redis, userId: string, endpoint: string, costCents: number): Promise<void> {
    const mb = minuteBucket();
    const multi = redis.multi();

    multi.incrbyfloat(`${LLM_COST_MINUTE}:${mb}`, costCents);
    multi.expire(`${LLM_COST_MINUTE}:${mb}`, 7200);

    multi.incrbyfloat(`${LLM_USER_PREFIX}${userId}:${mb}`, costCents);
    multi.expire(`${LLM_USER_PREFIX}${userId}:${mb}`, 7200);

    multi.incrbyfloat(`${LLM_ENDPOINT_PREFIX}${endpoint}:${mb}`, costCents);
    multi.expire(`${LLM_ENDPOINT_PREFIX}${endpoint}:${mb}`, 7200);

    await multi.exec();

    Baselines.updateBaseline(redis, 'llm', costCents, '1h').catch(() => {});
    CostSafety.updateUserCost(redis, userId, costCents).catch(() => {});
  }

  static async getCostPerMinute(redis: Redis): Promise<number> {
    const mb = minuteBucket();
    const raw = await redis.get(`${LLM_COST_MINUTE}:${mb}`);
    return Number(raw) || 0;
  }

  static async getCostPerUser(redis: Redis, limit = 10): Promise<Array<{ userId: string; costCents: number }>> {
    const mb = minuteBucket();
    let cursor = '0';
    const results: Array<{ userId: string; costCents: number }> = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${LLM_USER_PREFIX}*:${mb}`, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const v = Number(values[i]) || 0;
          if (v > 0) {
            const userId = keys[i].slice(LLM_USER_PREFIX.length, -mb.length - 1);
            results.push({ userId, costCents: Math.round(v * 100) / 100 });
          }
        }
      }
    } while (cursor !== '0');
    results.sort((a, b) => b.costCents - a.costCents);
    return results.slice(0, limit);
  }

  static async getCostPerEndpoint(redis: Redis, limit = 10): Promise<Array<{ endpoint: string; costCents: number }>> {
    const mb = minuteBucket();
    let cursor = '0';
    const results: Array<{ endpoint: string; costCents: number }> = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${LLM_ENDPOINT_PREFIX}*:${mb}`, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const v = Number(values[i]) || 0;
          if (v > 0) {
            const endpoint = keys[i].slice(LLM_ENDPOINT_PREFIX.length, -mb.length - 1);
            results.push({ endpoint, costCents: Math.round(v * 100) / 100 });
          }
        }
      }
    } while (cursor !== '0');
    results.sort((a, b) => b.costCents - a.costCents);
    return results.slice(0, limit);
  }

  static async getBaselineCostCents(redis: Redis): Promise<number> {
    const now = new Date();
    let total = 0;
    let count = 0;
    for (let m = 1; m <= 10; m++) {
      const d = new Date(now.getTime() - m * 60000);
      const b = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const raw = await redis.get(`${LLM_COST_MINUTE}:${b}`);
      if (raw) {
        total += Number(raw);
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  static async checkAnomaly(currentCostCents: number, baselineCents: number): Promise<{ anomalyDetected: boolean; spikeRatio: number }> {
    if (baselineCents <= 0) return { anomalyDetected: false, spikeRatio: 0 };
    const spikeRatio = currentCostCents / baselineCents;
    return { anomalyDetected: spikeRatio > 2, spikeRatio: Math.round(spikeRatio * 100) / 100 };
  }

  static async getLLMMetrics(redis: Redis): Promise<Record<string, unknown>> {
    const [costPerMinute, costPerUser, costPerEndpoint, baseline] = await Promise.all([
      LLMCostMonitor.getCostPerMinute(redis),
      LLMCostMonitor.getCostPerUser(redis, 10),
      LLMCostMonitor.getCostPerEndpoint(redis, 10),
      LLMCostMonitor.getBaselineCostCents(redis),
    ]);
    const { anomalyDetected, spikeRatio } = await LLMCostMonitor.checkAnomaly(costPerMinute, baseline);
    return { costPerMinute: Math.round(costPerMinute * 100) / 100, costPerUser, costPerEndpoint, baselineCostCents: Math.round(baseline * 100) / 100, anomalyDetected, spikeRatio };
  }
}
