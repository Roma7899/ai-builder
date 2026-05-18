import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { Queue } from 'bullmq';
import { AppError } from '../auth/auth.service';
import type { StylePreferences } from './generation.schema';
import { withRls } from '../../lib/withRls';
import { getBullRedisConfig } from '../../lib/redisFactory';
import { getDefaultJobOptions, getRegionQueueName, checkQueuePressure } from '../../lib/createWorker';
import { incrementMetric } from '../../lib/metrics';
import { config } from '../../config';

const redisConnection = getBullRedisConfig();
const queueName = getRegionQueueName('generate');

export const generationQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: getDefaultJobOptions(),
});

function getMonthResetTTL(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return Math.floor((lastDay.getTime() - now.getTime()) / 1000);
}

export class GenerationService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
  ) {}

  async startGeneration(
    userId: string,
    projectId: string,
    prompt: string,
    stylePrefs?: StylePreferences,
    requestId?: string,
  ) {
    const project = await withRls(this.prisma, userId, async (tx) =>
      tx.project.findUnique({ where: { id: projectId } })
    );
    if (!project) throw new AppError(404, 'Project not found');
    if (project.userId !== userId) throw new AppError(403, 'Forbidden');
    if (project.status === 'deleted') throw new AppError(400, 'Project is deleted');

    const user = await withRls(this.prisma, userId, async (tx) =>
      tx.user.findUnique({ where: { id: userId } })
    );
    if (!user) throw new AppError(404, 'User not found');

    if (user.plan === 'free') {
      const key = `rate:generate:${userId}:2592000s`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, getMonthResetTTL());
      }
      if (count > 3) {
        throw new AppError(429, 'Monthly generation limit reached. Upgrade your plan for unlimited generations.');
      }
    }

    const pressure = await checkQueuePressure(generationQueue, config.queue.maxDepthGenerate);
    if (pressure.overloaded) {
      throw new AppError(429, `QUEUE_OVERLOADED: Generation queue at ${pressure.depth}/${config.queue.maxDepthGenerate}. Retry later.`);
    }

    const job = await withRls(this.prisma, userId, async (tx) =>
      tx.generationJob.create({
        data: {
          projectId,
          userId,
          prompt,
          status: 'pending',
        },
      })
    );

    const jobKey = `job:status:${job.id}`;
    await this.redis.set(
      jobKey,
      JSON.stringify({ status: 'pending', progress: 0, message: 'Queued...' }),
      'EX',
      86400,
    );

    await generationQueue.add(
      'generate',
      {
        jobId: job.id,
        projectId,
        userId,
        prompt,
        stylePreferences: stylePrefs ?? null,
        requestId: requestId || undefined,
      },
      { jobId: job.id },
    );

    await incrementMetric(this.redis, 'jobs_created');

    return { jobId: job.id };
  }
}
