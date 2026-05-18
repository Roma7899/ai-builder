import { Queue, Worker } from 'bullmq';
import { getBullRedisConfig } from '../../lib/redisFactory';
import { config } from '../../config';
import { getDeadLetterQueueName } from '../../lib/createWorker';

const MAX_RETRIES = 3;
const DLQ_RETENTION_DAYS = 14;
const MONITOR_THRESHOLD = 50;

interface DLQJobData {
  originalJobId: string;
  originalQueue: string;
  jobData: Record<string, unknown>;
  error: {
    message: string;
    stack?: string;
    failedReason?: string;
    stacktrace?: string[];
  };
  retryCount: number;
  timestamp: string;
  requestId?: string;
}

export async function checkDLQHealth(redis: ReturnType<typeof import('../../lib/redisFactory').getRedis>): Promise<{
  total: number;
  retryable: number;
  permanent: number;
  healthy: boolean;
}> {
  const counts = { total: 0, retryable: 0, permanent: 0, healthy: true };
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `*:dlq:*`, 'COUNT', 200);
    cursor = nextCursor;
    counts.total += keys.length;
    for (const key of keys) {
      const type = await redis.type(key);
      if (type === 'list') {
        const len = await redis.llen(key);
        counts.total += len - 1;
      }
    }
  } while (cursor !== '0');
  return counts;
}

export async function cleanupDLQ(redis: ReturnType<typeof import('../../lib/redisFactory').getRedis>): Promise<number> {
  const cutoff = Date.now() - DLQ_RETENTION_DAYS * 86400000;
  let removed = 0;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `*:dlq`, 'COUNT', 200);
    cursor = nextCursor;
    for (const key of keys) {
      const count = await redis.llen(key);
      for (let i = 0; i < count; i++) {
        const raw = await redis.lindex(key, i);
        if (raw) {
          try {
            const entry = JSON.parse(raw);
            const ts = new Date(entry.timestamp).getTime();
            if (ts < cutoff) {
              await redis.lrem(key, 1, raw);
              removed++;
            }
          } catch { /* skip unparseable entries */ }
        }
      }
    }
  } while (cursor !== '0');
  return removed;
}

async function processDLQJob(job: import('bullmq').Job<DLQJobData>): Promise<void> {
  const { originalQueue, jobData, originalJobId, retryCount } = job.data;

  if (retryCount >= MAX_RETRIES) {
    const permanentKey = `dlq:permanent:${originalQueue}:${originalJobId}`;
      const redis = ((job as any).queue as any).opts?.connection;
    if (redis) {
      await redis.set(permanentKey, JSON.stringify({
        ...job.data,
        movedToPermanent: new Date().toISOString(),
        permanent: true,
        retriesExhausted: true,
      }), 'EX', DLQ_RETENTION_DAYS * 86400);
    }
    return;
  }

  const baseName = originalQueue.split(':')[0];
  const targetQueue = new Queue(originalQueue, {
    connection: ((job as any).queue as any).opts?.connection,
  });

  try {
    const isOverloaded = await checkQueueDepth(targetQueue);
    if (isOverloaded) {
      const dlqName = getDeadLetterQueueName(baseName);
      const dlq = new Queue(dlqName, { connection: ((job as any).queue as any).opts?.connection });
      try {
        await dlq.add('dlq', {
          ...job.data,
          retryCount: retryCount + 1,
          timestamp: new Date().toISOString(),
          error: {
            ...job.data.error,
            message: `DEFERRED: Queue overloaded at retry ${retryCount + 1}: ${job.data.error.message}`,
          },
        });
      } finally {
        await dlq.close().catch(() => {});
      }
      return;
    }

    await targetQueue.add(
      baseName,
      { ...jobData, requestId: job.data.requestId },
      { jobId: `dlq-retry-${originalJobId}-${retryCount + 1}` },
    );
  } finally {
    await targetQueue.close().catch(() => {});
  }
}

async function checkQueueDepth(queue: Queue): Promise<boolean> {
  const [active, waiting, delayed] = await Promise.all([
    queue.getActiveCount(),
    queue.getWaitingCount(),
    queue.getDelayedCount(),
  ]);
  return active + waiting + delayed >= config.queue.maxDepthPublish;
}

const bullRedis = getBullRedisConfig();

function createDLQWorker(baseQueue: string): Worker<DLQJobData> {
  const dlqName = getDeadLetterQueueName(baseQueue);
  const dlq = new Queue(dlqName, { connection: bullRedis });
  const worker = new Worker<DLQJobData>(
    dlqName,
    async (job) => {
      await processDLQJob(job);
    },
    {
      connection: bullRedis,
      concurrency: 1,
      maxStalledCount: 1,
      stalledInterval: 60000,
      removeOnComplete: { age: DLQ_RETENTION_DAYS * 86400 },
      removeOnFail: { age: DLQ_RETENTION_DAYS * 86400 },
    },
  );

  worker.on('completed', (job) => {
    console.log(`[dlq:${baseQueue}] Job ${job.id} processed (retryCount=${job.data.retryCount})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[dlq:${baseQueue}] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

const generateDLQWorker = createDLQWorker('generate');
const publishDLQWorker = createDLQWorker('publish');

export function startDLQConsumers() {
  console.log('[dlq] DLQ consumers started for generate and publish queues');
  return { generateDLQWorker, publishDLQWorker };
}

export function stopDLQConsumers() {
  generateDLQWorker.close().catch(() => {});
  publishDLQWorker.close().catch(() => {});
}

export { generateDLQWorker, publishDLQWorker };
