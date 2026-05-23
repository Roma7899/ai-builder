import { Worker, Queue, type WorkerOptions, type JobsOptions } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { getBullRedis } from './redisFactory';
import { incrementMetric } from './metrics';

let prismaSingleton: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new (PrismaClient as any)();
  }
  return prismaSingleton!;
}

export function getRegionQueueName(baseQueue: string): string {
  return `${baseQueue}-${config.region}`;
}

export function getDeadLetterQueueName(baseQueue: string): string {
  return `${getRegionQueueName(baseQueue)}-dlq`;
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const workerId = `${config.region}:${randomUUID().slice(0, 8)}`;

function startHeartbeat(redis: ReturnType<typeof getBullRedis>): void {
  const key = `worker:heartbeat:${workerId}`;
  const ttlSec = Math.ceil(config.worker.heartbeatTtl / 1000) + 5;

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    redis.set(key, JSON.stringify({
      workerId,
      region: config.region,
      timestamp: new Date().toISOString(),
    }), 'EX', ttlSec).catch(() => {});
  }, config.worker.heartbeatInterval);
}

export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export async function moveToDeadLetterQueue(
  queue: Queue,
  job: Pick<import('bullmq').Job, 'id' | 'data' | 'attemptsMade' | 'failedReason' | 'stacktrace'>,
  error: Error,
): Promise<void> {
  const dlqName = getDeadLetterQueueName(queue.name.split(':')[0]);
  const dlq = new Queue(dlqName, { connection: (queue as any).opts?.connection });
  const jobData = (job.data as Record<string, unknown>) || {};
  try {
    await dlq.add('dlq', {
      originalJobId: job.id,
      originalQueue: queue.name,
      jobData,
      error: {
        message: error.message,
        stack: error.stack,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
      },
      retryCount: job.attemptsMade,
      timestamp: new Date().toISOString(),
      requestId: jobData.requestId || undefined,
    });
  } finally {
    await dlq.close().catch(() => {});
  }
}

export async function checkQueuePressure(
  queue: Queue,
  maxDepth: number,
): Promise<{ overloaded: boolean; depth: number }> {
  const [active, waiting, delayed] = await Promise.all([
    queue.getActiveCount(),
    queue.getWaitingCount(),
    queue.getDelayedCount(),
  ]);
  const depth = active + waiting + delayed;
  return { overloaded: depth >= maxDepth, depth };
}

export function createWorker<T = unknown>(
  baseQueueName: string,
  processor: (job: import('bullmq').Job<T>) => Promise<void>,
  concurrency?: number,
  redisOverride?: ReturnType<typeof getBullRedis>,
): Worker<T> {
  const redis = redisOverride ?? getBullRedis();
  const regionQueue = getRegionQueueName(baseQueueName);

  startHeartbeat(redis);

  const worker = new Worker<T>(
    regionQueue,
    async (job) => {
      await processor(job);
    },
    {
      connection: redis,
      concurrency: concurrency ?? 2,
      maxStalledCount: config.worker.maxStalledCount,
      stalledInterval: config.worker.stalledInterval,
      lockDuration: 60000,
      lockRenewTime: 30000,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      settings: {
        backoffStrategy: (attemptsMade: number) => Math.min(1000 * Math.pow(2, attemptsMade), 30000),
      },
    } as WorkerOptions,
  );

  worker.on('error', (err) => {
    console.error(`[worker:${regionQueue}] Error:`, err.message);
  });

  return worker;
}

export function getDefaultJobOptions(): JobsOptions {
  return {
    attempts: config.worker.defaultAttempts,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 86400 * 7, count: 50 },
  };
}

export { workerId };
