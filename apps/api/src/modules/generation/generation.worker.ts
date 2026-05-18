import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Queue } from 'bullmq';
import { siteJSONSchema } from './generation.schema';
import { buildSystemPrompt } from './generation.prompts';
import type { StylePreferences, SiteJSON } from './generation.schema';
import { withRls } from '../../lib/withRls';
import { checkBudget, recordUsage } from '../../lib/llmBudget';
import { getModelName } from '../../lib/llmCost';
import { createWorker, getPrisma, moveToDeadLetterQueue, getRegionQueueName } from '../../lib/createWorker';
import { getRedis, getBullRedisConfig } from '../../lib/redisFactory';
import { incrementMetric } from '../../lib/metrics';
import { LLMCostMonitor } from '../../lib/monitoring/llm';
import { isShuttingDown } from '../../lib/gracefulShutdown';
import { checkRateLimit } from '../../lib/rateLimit';
import { config } from '../../config';

const prisma = getPrisma();
const redis = getRedis();
const bullRedis = getBullRedisConfig();

interface JobData {
  jobId: string;
  projectId: string;
  userId: string;
  prompt: string;
  stylePreferences: StylePreferences | null;
  requestId?: string;
}

interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

const LLM_TIMEOUT_MS = 60000;

function createLLMProvider() {
  const provider = config.llm.provider;

  if (provider === 'anthropic') {
    const anthropic = new Anthropic({
      apiKey: config.llm.anthropicKey,
    });
    return {
      provider: 'anthropic' as const,
      complete: async (systemPrompt: string, userPrompt: string): Promise<LLMResponse> => {
        const result = await Promise.race([
          anthropic.messages.create({
            model: config.llm.anthropicModel,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LLM_TIMEOUT: Anthropic call exceeded 60s')), LLM_TIMEOUT_MS)
          ),
        ]);
        const block = result.content[0];
        if (block?.type !== 'text') throw new Error('Unexpected Anthropic response format');
        return {
          content: block.text,
          inputTokens: result.usage?.input_tokens ?? 0,
          outputTokens: result.usage?.output_tokens ?? 0,
        };
      },
    };
  }

  const openai = new OpenAI({
    apiKey: config.llm.openAiKey,
    timeout: LLM_TIMEOUT_MS,
    maxRetries: 0,
  });

  return {
    provider: 'openai' as const,
    complete: async (systemPrompt: string, userPrompt: string): Promise<LLMResponse> => {
      const response = await Promise.race([
        openai.chat.completions.create({
          model: config.llm.openAiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM_TIMEOUT: OpenAI call exceeded 60s')), LLM_TIMEOUT_MS)
        ),
      ]);
      return {
        content: response.choices[0]?.message?.content ?? '',
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      };
    },
  };
}

function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  const backtickMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (backtickMatch) return backtickMatch[1].trim();
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }
  return trimmed;
}

async function updateJobStatus(
  jobId: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({ status, ...extra });
  await redis.set(`job:status:${jobId}`, payload, 'EX', 86400);
  await redis.publish(`job:events:${jobId}`, payload);
}

async function processJob(jobData: JobData): Promise<void> {
  if (isShuttingDown()) {
    throw new Error('Shutting down — job rejected');
  }

  const { jobId, projectId, userId, prompt, stylePreferences, requestId } = jobData;
  const logCtx = { requestId: requestId || 'unknown', jobId, projectId, userId };
  const startTime = Date.now();

  const existing = await withRls(prisma, userId, async (tx) =>
    tx.generationJob.findUnique({ where: { id: jobId } })
  );
  if (existing && (existing.status === 'done' || existing.status === 'running')) {
    return;
  }

  const updated = await withRls(prisma, userId, async (tx) =>
    tx.generationJob.updateMany({
      where: { id: jobId, status: 'pending' },
      data: { status: 'running', startedAt: new Date() },
    })
  );
  if (updated.count === 0) return;

  await updateJobStatus(jobId, 'running', { progress: 5, message: 'Analyzing your business...' });

  const user = await withRls(prisma, userId, async (tx) =>
    tx.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })
  );
  const plan = user?.plan ?? 'free';

  if (plan === 'free') {
    const allowed = await checkRateLimit(redis, 'worker:generate', userId, config.rateLimit.workerGenerateMax, config.rateLimit.workerGenerateWindowSec);
    if (!allowed) {
      const errorMsg = 'RATE_LIMIT_EXCEEDED: Hourly generation limit reached. Try again later.';
      await Promise.all([
        withRls(prisma, userId, async (tx) =>
          tx.generationJob.update({
            where: { id: jobId },
            data: { status: 'failed', error: errorMsg, finishedAt: new Date() },
          })
        ),
        updateJobStatus(jobId, 'failed', { progress: 100, message: errorMsg, error: errorMsg }),
      ]);
      throw new Error(errorMsg);
    }
  }

  const llm = createLLMProvider();
  const maxRetries = 2;
  let currentPrompt = prompt;
  let siteJSON: SiteJSON | null = null;
  let lastError = '';

  const lockKey = `llm:lock:${jobId}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const systemPrompt = buildSystemPrompt(stylePreferences ?? undefined);

      const budget = await checkBudget(redis, userId, plan, systemPrompt, currentPrompt);
      if (!budget.allowed) {
        await Promise.all([
          withRls(prisma, userId, async (tx) =>
            tx.generationJob.update({
              where: { id: jobId },
              data: { status: 'failed', error: budget.reason, finishedAt: new Date() },
            })
          ),
          updateJobStatus(jobId, 'failed', { progress: 100, message: budget.reason, error: budget.reason }),
        ]);
        throw new Error(budget.reason);
      }

      await Promise.all([
        withRls(prisma, userId, async (tx) =>
          tx.generationJob.update({
            where: { id: jobId },
            data: {
              status: 'running',
              startedAt: new Date(),
              error: attempt > 0 ? `Retry attempt ${attempt + 1}/${maxRetries + 1}` : null,
            },
          })
        ),
        updateJobStatus(jobId, 'running', {
          progress: 15 + attempt * 30,
          message: attempt === 0
            ? 'Crafting your sections...'
            : `Retrying with improvements (attempt ${attempt + 1})...`,
        }),
      ]);

      const acquired = await redis.set(lockKey, '1', 'PX', 60000, 'NX');
      if (!acquired) {
        throw new Error('Concurrent LLM call detected for this job — retrying');
      }

      let llmResponse: LLMResponse;
      try {
        llmResponse = await llm.complete(systemPrompt, currentPrompt);
      } finally {
        await redis.del(lockKey).catch(() => {});
      }

      const model = getModelName();
      await recordUsage(redis, userId, llmResponse.inputTokens + llmResponse.outputTokens, budget.estimatedCostCents, model, budget.estimatedCostCents);

      LLMCostMonitor.recordCost(redis, userId, '/generate', budget.estimatedCostCents).catch(() => {});

      const raw = llmResponse.content;
      const cleaned = extractJSON(raw);
      const parsed = JSON.parse(cleaned);
      const validation = siteJSONSchema.safeParse(parsed);

      if (!validation.success) {
        lastError = 'VALIDATION_FAILED: ' + validation.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        if (attempt < maxRetries) {
          currentPrompt =
            `${prompt}\n\nPrevious attempt generated invalid JSON.\nErrors: ${lastError}\nPlease fix and return ONLY valid JSON matching the schema.`;
        }
        continue;
      }

      siteJSON = validation.data;
      break;
    } catch (err: any) {
      const msg = err.message ?? 'Unknown error';
      lastError = msg.startsWith('LLM_') || msg.startsWith('RATE_LIMIT') || msg.startsWith('VALIDATION_') || msg.startsWith('BUDGET_CHECK')
        ? msg
        : `LLM_FAILED: ${msg}`;
      if (attempt < maxRetries) {
        currentPrompt =
          `${prompt}\n\nPrevious attempt failed with: ${lastError}\nPlease fix and return ONLY valid JSON.`;
      }
    }
  }

  const durationMs = Date.now() - startTime;

  if (!siteJSON) {
    const errorMsg = `Generation failed after ${maxRetries + 1} attempts: ${lastError}`;
    await Promise.all([
      withRls(prisma, userId, async (tx) =>
        tx.generationJob.update({
          where: { id: jobId },
          data: { status: 'failed', error: errorMsg, finishedAt: new Date() },
        })
      ),
      updateJobStatus(jobId, 'failed', { progress: 100, message: errorMsg, error: errorMsg }),
    ]);
    await Promise.all([
      incrementMetric(redis, 'job_duration_ms', durationMs),
      incrementMetric(redis, 'jobs_failed'),
    ]);
    throw new Error(errorMsg);
  }

  await updateJobStatus(jobId, 'running', {
    progress: 85,
    message: 'Saving your website...',
  });

  const project = await withRls(prisma, userId, async (tx) =>
    tx.project.findUnique({
      where: { id: projectId },
      select: { currentVersion: true },
    })
  );

  const newVersion = (project?.currentVersion ?? 0) + 1;

  let siteVersion: { version: number };
  try {
    siteVersion = await withRls(prisma, userId, async (tx) => {
      const sv = await tx.siteVersion.create({
        data: {
          projectId,
          version: newVersion,
          siteJson: siteJSON as any,
          promptUsed: prompt,
        },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { currentVersion: newVersion, status: 'live' },
      });
      await tx.generationJob.update({
        where: { id: jobId },
        data: { status: 'done', resultJson: siteJSON as any, finishedAt: new Date() },
      });
      return sv;
    });
  } catch (err) {
    await withRls(prisma, userId, async (tx) =>
      tx.generationJob.update({
        where: { id: jobId },
        data: { status: 'failed', error: `Transaction failed: ${(err as Error).message}`, finishedAt: new Date() },
      })
    );
    await updateJobStatus(jobId, 'failed', { progress: 100, message: 'Transaction failed', error: (err as Error).message });
    await Promise.all([
      incrementMetric(redis, 'job_duration_ms', durationMs),
      incrementMetric(redis, 'jobs_failed'),
    ]);
    throw err;
  }

  await Promise.all([
    incrementMetric(redis, 'job_duration_ms', durationMs),
    incrementMetric(redis, 'jobs_success'),
  ]);

  await updateJobStatus(jobId, 'done', {
    progress: 100,
    message: 'Website generated successfully!',
    version: siteVersion.version,
    projectId,
  });
}

const worker = createWorker<JobData>(
  'generate',
  async (job) => {
    await processJob(job.data);
  },
  config.worker.generateConcurrency,
);

const generateQueue = new Queue(getRegionQueueName('generate'), { connection: bullRedis });

worker.on('completed', (job) => {
  const ctx = { jobId: job.data.jobId, projectId: job.data.projectId, requestId: job.data.requestId };
  job.log(`Generation job completed: ${JSON.stringify(ctx)}`);
});

worker.on('failed', async (job, err) => {
  if (job) {
    const ctx = { jobId: job.data.jobId, projectId: job.data.projectId, requestId: job.data.requestId, error: err.message };
    job.log(`Generation job failed: ${JSON.stringify(ctx)}`);
    await moveToDeadLetterQueue(generateQueue, { ...job, data: { ...job.data, requestId: job.data.requestId } }, err);
  }
});

export { worker };
export default worker;
