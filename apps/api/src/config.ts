export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  region: process.env.REGION ?? 'default',

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'ai-builder:',
  },

  worker: {
    generateConcurrency: Number(process.env.WORKER_CONCURRENCY_GENERATE ?? 2),
    publishConcurrency: Number(process.env.WORKER_CONCURRENCY_PUBLISH ?? 2),
    stalledInterval: Number(process.env.WORKER_STALLED_INTERVAL ?? 30000),
    maxStalledCount: Number(process.env.WORKER_MAX_STALLED ?? 1),
    defaultAttempts: 3,
    heartbeatInterval: Number(process.env.WORKER_HEARTBEAT_INTERVAL ?? 10000),
    heartbeatTtl: Number(process.env.WORKER_HEARTBEAT_TTL ?? 30000),
  },

  queue: {
    maxDepthGenerate: Number(process.env.MAX_QUEUE_DEPTH_GENERATE ?? 50),
    maxDepthPublish: Number(process.env.MAX_QUEUE_DEPTH_PUBLISH ?? 20),
  },

  llm: {
    provider: process.env.LLM_PROVIDER ?? 'openai',
    openAiKey: process.env.OPENAI_API_KEY ?? '',
    openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  },

  jwt: {
    privateKey: (process.env.JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    publicKey: (process.env.JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'),
  },

  r2: {
    endpoint: process.env.R2_ENDPOINT ?? '',
    accessKey: process.env.R2_ACCESS_KEY ?? '',
    secretKey: process.env.R2_SECRET_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    publicUrl: process.env.R2_PUBLIC_URL ?? '',
  },

  cf: {
    apiToken: process.env.CF_API_TOKEN ?? '',
    zoneId: process.env.CF_ZONE_ID ?? '',
    cnameTarget: process.env.CDN_CNAME_TARGET ?? '',
  },

  domainVerificationSecret: process.env.DOMAIN_VERIFICATION_SECRET ?? '',

  rateLimit: {
    globalMaxPerMinute: Number(process.env.RL_GLOBAL_MAX_PER_MIN ?? 30),
    globalBurstMax: Number(process.env.RL_GLOBAL_BURST_MAX ?? 5),
    globalBurstWindowSec: Number(process.env.RL_GLOBAL_BURST_WINDOW_SEC ?? 10),
    workerGenerateMax: Number(process.env.RL_WORKER_GENERATE_MAX ?? 10),
    workerGenerateWindowSec: Number(process.env.RL_WORKER_GENERATE_WINDOW_SEC ?? 3600),
    workerPublishMax: Number(process.env.RL_WORKER_PUBLISH_MAX ?? 5),
    workerPublishWindowSec: Number(process.env.RL_WORKER_PUBLISH_WINDOW_SEC ?? 60),
  },
} as const;

export type Config = typeof config;
