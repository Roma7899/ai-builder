import { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { Queue } from 'bullmq';
import { AppError } from '../auth/auth.service';
import { uploadFile, getPublicUrl } from './cdn.client';
import { renderFullHTML } from './html.builder';
import type { SiteJSON } from './html.builder';
import { withRls } from '../../lib/withRls';
import { getDefaultJobOptions, getRegionQueueName, checkQueuePressure } from '../../lib/createWorker';
import { getBullRedisConfig } from '../../lib/redisFactory';
import { incrementMetric } from '../../lib/metrics';
import { config } from '../../config';

const redisConnection = getBullRedisConfig();
const queueName = getRegionQueueName('publish');

export const publishQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: getDefaultJobOptions(),
});

export class PublishService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
  ) {}

  private async verifyOwnership(projectId: string, userId: string) {
    return withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError(404, 'Project not found');
      if (project.userId !== userId) throw new AppError(403, 'Forbidden');
      return project;
    });
  }

  async startDeployment(projectId: string, userId: string, requestId?: string) {
    const project = await this.verifyOwnership(projectId, userId);

    const siteVersion = await withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      })
    );
    if (!siteVersion) throw new AppError(400, 'No site version to publish');

    const pressure = await checkQueuePressure(publishQueue, config.queue.maxDepthPublish);
    if (pressure.overloaded) {
      throw new AppError(429, `QUEUE_OVERLOADED: Publish queue at ${pressure.depth}/${config.queue.maxDepthPublish}. Retry later.`);
    }

    const deployment = await withRls(this.prisma, userId, async (tx) =>
      tx.publishDeployment.create({
        data: {
          projectId,
          version: siteVersion.version,
          status: 'pending',
        },
      })
    );

    const cdnUrl = getPublicUrl(`sites/${projectId}/v${siteVersion.version}/index.html`);

    await publishQueue.add(
      'publish',
      {
        deploymentId: deployment.id,
        projectId,
        userId,
        version: siteVersion.version,
        siteJson: siteVersion.siteJson as any,
        cdnUrl,
        requestId: requestId || undefined,
      },
      { jobId: deployment.id }
    );

    await incrementMetric(this.redis, 'jobs_created');

    return { deploymentId: deployment.id };
  }

  async processDeployment(
    deploymentId: string,
    projectId: string,
    version: number,
    siteJson: SiteJSON,
    cdnUrl: string,
    userId: string,
  ) {
    await this.updateStatus(deploymentId, 'building', 'Building HTML...');

    const html = renderFullHTML(siteJson);
    const key = `sites/${projectId}/v${version}/index.html`;

    await this.updateStatus(deploymentId, 'uploading', 'Uploading to CDN...');

    await uploadFile(key, html, 'text/html', 'public, max-age=300');

    const now = new Date();

    await withRls(this.prisma, userId, async (tx) => {
      const dep = await tx.publishDeployment.update({
        where: { id: deploymentId, status: 'uploading' },
        data: { status: 'done', cdnUrl, deployedAt: now },
      });
      if (!dep) throw new Error('Concurrent publish detected — deployment status race');
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'live', publishedAt: now },
      });
    });

    await this.emitStatus(deploymentId, 'done', 'Site is live!', { cdnUrl });
  }

  async failDeployment(deploymentId: string, error: string, userId: string) {
    const result = await withRls(this.prisma, userId, async (tx) =>
      tx.publishDeployment.updateMany({
        where: { id: deploymentId, status: { in: ['building', 'uploading'] } },
        data: { status: 'failed' },
      })
    );
    if (result.count === 0) return;
    await this.emitStatus(deploymentId, 'failed', error);
  }

  async updateStatus(
    deploymentId: string,
    status: string,
    message: string,
    extra: Record<string, unknown> = {}
  ) {
    const payload = JSON.stringify({ status, message, ...extra });
    await this.redis.set(`deploy:status:${deploymentId}`, payload, 'EX', 86400);
    await this.redis.publish(`deploy:events:${deploymentId}`, payload);
  }

  private async emitStatus(
    deploymentId: string,
    status: string,
    message: string,
    extra: Record<string, unknown> = {}
  ) {
    await this.updateStatus(deploymentId, status, message, extra);
  }
}
