import type { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { shutdownAll as shutdownRedis } from './redisFactory';
import { stopHeartbeat, workerId } from './createWorker';
import { sseManager } from './sse/sse.manager';

interface ShutdownOptions {
  workers: Worker[];
  queues: Queue[];
  prisma: PrismaClient;
  app?: { close: () => Promise<void> };
  timeout?: number;
}

let shuttingDown = false;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function registerShutdown(opts: ShutdownOptions): void {
  const timeout = opts.timeout ?? 30000;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[shutdown] Received ${signal}. Draining workers...`);

    // Step 1: Drain queues — stop accepting new jobs
    await Promise.allSettled(opts.queues.map((q) => q.drain().catch(() => {})));

    // Step 2: Pause workers — no new job pickups
    await Promise.allSettled(opts.workers.map((w) => w.pause().catch(() => {})));

    // Step 3: Wait for running jobs with timeout
    const closePromises = opts.workers.map((w) => w.close(true));
    const closeTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Worker close timeout')), timeout)
    );

    try {
      await Promise.race([Promise.allSettled(closePromises), closeTimeout]);
    } catch {
      console.warn('[shutdown] Worker close timed out — forcing shutdown');
    }

    // Step 4: Stop heartbeat
    stopHeartbeat();

    // Step 5: Close SSE subscriber
    await sseManager.shutdown();

    // Step 6: Close HTTP server
    if (opts.app) {
      await opts.app.close().catch(() => {});
    }

    // Step 7: Disconnect Prisma
    await opts.prisma.$disconnect().catch(() => {});

    // Step 8: Shutdown Redis connections
    await shutdownRedis();

    console.log('[shutdown] Complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Prevent unhandled rejections from crashing half-shutdown
  process.on('unhandledRejection', (err) => {
    console.error('[shutdown] Unhandled rejection:', err);
  });
}
