import { buildApp } from './app';
import { config } from './config';
import { getPrisma } from './lib/createWorker';
import { getRedis } from './lib/redisFactory';
import { registerShutdown } from './lib/gracefulShutdown';

import generationWorker from './modules/generation/generation.worker';
import publishWorker from './modules/publish/publish.worker';
import { generationQueue } from './modules/generation/generation.service';
import { publishQueue } from './modules/publish/publish.service';
import { startDLQConsumers, stopDLQConsumers, generateDLQWorker, publishDLQWorker } from './modules/dlq/dlq.consumer';

function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[env] Missing required variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

validateEnv();

async function start() {
  const app = await buildApp();

  // Warm connections
  const prisma = getPrisma();
  await (prisma as any).$connect();

  const redis = getRedis();
  await redis.ping();

  // Print scaling identity
  console.log(`[start] Worker identity: region=${config.region}, pid=${process.pid}`);
  console.log(`[start] Concurrency: generate=${config.worker.generateConcurrency}, publish=${config.worker.publishConcurrency}`);

  // Start DLQ consumers for failed job retries
  startDLQConsumers();

  // Register graceful shutdown with all resources
  registerShutdown({
    workers: [generationWorker, publishWorker, generateDLQWorker as any, publishDLQWorker as any],
    queues: [generationQueue, publishQueue],
    prisma,
    app,
    timeout: 25000,
  });

  // Start accepting traffic
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`[start] Server listening on port ${config.port}`);
}

start().catch((err) => {
  console.error('[start] Fatal startup error:', err);
  process.exit(1);
});
