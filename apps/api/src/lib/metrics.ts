import type Redis from 'ioredis';
import { config } from '../config';

function bucketKey(metric: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  return `metrics:${metric}:${config.region}:${yyyy}-${mm}-${dd}:${hh}`;
}

export async function incrementMetric(
  redis: Redis,
  metric: string,
  value = 1,
): Promise<void> {
  const key = bucketKey(metric);
  const multi = redis.multi();
  if (Number.isInteger(value)) {
    multi.incrby(key, value);
  } else {
    multi.incrbyfloat(key, value);
  }
  multi.expire(key, 86400 * 8);
  await multi.exec();
}

export interface MetricsSnapshot {
  jobsCreated: number;
  jobsFailed: number;
  jobsSuccess: number;
  queueDepth: Record<string, number>;
  llmCostTotal: number;
  llmTokensTotal: number;
  avgJobDurationMs: number;
  activeWorkers: number;
  successRate: number;
}

export async function getMetricsSnapshot(
  redis: Redis,
  queueDepthInfo: Record<string, number>,
  activeWorkers: number,
): Promise<MetricsSnapshot> {
  const todayPrefix = bucketKey('').slice(0, -3);

  const scanKeys = async (pattern: string): Promise<{ key: string; value: number }[]> => {
    const results: { key: string; value: number }[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const v = values[i];
          if (v !== null) {
            results.push({ key: keys[i], value: Number(v) || 0 });
          }
        }
      }
    } while (cursor !== '0');
    return results;
  };

  const [created, failed, success, costKeys, tokenKeys] = await Promise.all([
    scanKeys(`${todayPrefix}:*:jobs_created`),
    scanKeys(`${todayPrefix}:*:jobs_failed`),
    scanKeys(`${todayPrefix}:*:jobs_success`),
    scanKeys(`${todayPrefix}:*:llm_cost_total`),
    scanKeys(`${todayPrefix}:*:llm_tokens_total`),
  ]);

  const sum = (arr: { value: number }[]) => arr.reduce((a, b) => a + b.value, 0);
  const totalCreated = sum(created);
  const totalFailed = sum(failed);
  const totalSuccess = sum(success);
  const totalCost = sum(costKeys);
  const totalTokens = sum(tokenKeys);

  const completed = totalSuccess + totalFailed;
  const successRate = completed > 0 ? (totalSuccess / completed) * 100 : 100;

  const durationPattern = `${todayPrefix}:*:job_duration_ms`;
  let totalDuration = 0;
  let durationCount = 0;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', durationPattern, 'COUNT', 500);
    cursor = nextCursor;
    if (keys.length > 0) {
      const values = await redis.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        const v = values[i];
        if (v !== null) {
          totalDuration += Number(v) || 0;
          durationCount++;
        }
      }
    }
  } while (cursor !== '0');

  const avgJobDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

  return {
    jobsCreated: totalCreated,
    jobsFailed: totalFailed,
    jobsSuccess: totalSuccess,
    queueDepth: queueDepthInfo,
    llmCostTotal: Math.round(totalCost * 100) / 100,
    llmTokensTotal: totalTokens,
    avgJobDurationMs,
    activeWorkers,
    successRate: Math.round(successRate * 100) / 100,
  };
}

export async function resetMetricsBucket(redis: Redis): Promise<void> {
  const pattern = `metrics:*:${config.region}:*`;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

export function getMetricPrefix(): string {
  return `metrics:*:${config.region}:`;
}
