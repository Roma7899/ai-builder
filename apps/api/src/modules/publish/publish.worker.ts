import { Queue } from 'bullmq';
import { PublishService } from './publish.service';
import type { SiteJSON } from './html.builder';
import { createWorker, getPrisma, moveToDeadLetterQueue, getRegionQueueName } from '../../lib/createWorker';
import { getRedis, getBullRedisConfig } from '../../lib/redisFactory';
import { incrementMetric } from '../../lib/metrics';
import { isShuttingDown } from '../../lib/gracefulShutdown';
import { checkRateLimit } from '../../lib/rateLimit';
import { config } from '../../config';

const prisma = getPrisma();
const redis = getRedis();
const bullRedis = getBullRedisConfig();

const publishService = new PublishService(prisma, redis);

interface JobData {
  deploymentId: string;
  projectId: string;
  userId: string;
  version: number;
  siteJson: SiteJSON;
  cdnUrl: string;
  requestId?: string;
}

const worker = createWorker<JobData>(
  'publish',
  async (job) => {
    if (isShuttingDown()) {
      throw new Error('Shutting down — job rejected');
    }

    const { deploymentId, projectId, userId, version, siteJson, cdnUrl, requestId } = job.data;
    const logCtx = { requestId: requestId || 'unknown', deploymentId, projectId, userId };
    const startTime = Date.now();

    const allowed = await checkRateLimit(redis, 'worker:publish', userId, config.rateLimit.workerPublishMax, config.rateLimit.workerPublishWindowSec);
    if (!allowed) {
      await publishService.failDeployment(deploymentId, 'RATE_LIMIT_EXCEEDED: Publish rate limit reached. Try again later.', userId);
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    try {
      await publishService.processDeployment(deploymentId, projectId, version, siteJson, cdnUrl, userId);
      await incrementMetric(redis, 'jobs_success');
      await incrementMetric(redis, 'job_duration_ms', Date.now() - startTime);
    } catch (err: any) {
      await publishService.failDeployment(deploymentId, err.message ?? 'Deployment failed', userId);
      await Promise.all([
        incrementMetric(redis, 'jobs_failed'),
        incrementMetric(redis, 'job_duration_ms', Date.now() - startTime),
      ]);
      throw err;
    }
  },
  config.worker.publishConcurrency,
);

const publishQueue = new Queue(getRegionQueueName('publish'), { connection: bullRedis });

worker.on('completed', (job) => {
  const ctx = { deploymentId: job.data.deploymentId, projectId: job.data.projectId, requestId: job.data.requestId };
  job.log(`Publish job completed: ${JSON.stringify(ctx)}`);
});

worker.on('failed', async (job, err) => {
  if (job) {
    const ctx = { deploymentId: job.data.deploymentId, projectId: job.data.projectId, requestId: job.data.requestId, error: err.message };
    job.log(`Publish job failed: ${JSON.stringify(ctx)}`);
    await moveToDeadLetterQueue(publishQueue, { ...job, data: { ...job.data, requestId: job.data.requestId } }, err);
  }
});

export { worker };
export default worker;
