import type Redis from 'ioredis';
import { estimateInputTokens, estimateOutputTokens, estimateCostCents, getMonthlyLimitCents, getModelName } from './llmCost';
import { incrementMetric } from './metrics';

const BUDGET_CHECK_SCRIPT = `
local projectedCost = tonumber(ARGV[1])
if not projectedCost or projectedCost < 0 then
  return -1
end

local currentCost = 0
local raw = redis.call('GET', KEYS[1])
if raw then
  currentCost = tonumber(raw) or 0
end

local limitCents = tonumber(ARGV[3])
if limitCents == nil or limitCents <= 0 then
  return 1
end

local newCost = currentCost + projectedCost

if ARGV[2] == 'free' then
  if newCost > limitCents * 0.9 then
    return 0
  end
  return 1
end

local hardCap = limitCents * 1.1
if newCost > hardCap then
  return 0
end

if currentCost >= limitCents then
  return 2
end

return 1
`;

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthTTL(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return Math.floor((lastDay.getTime() - now.getTime()) / 1000);
}

function emitLLMEvent(
  redis: Redis,
  eventType: string,
  payload: { userId: string; costCents?: number; tokens?: number; model?: string; estimatedCostCents?: number; drift?: number },
): void {
  const event = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  });
  redis.publish(`llm:events:${eventType}`, event).catch(() => {
    /* swallow pub/sub failures */
  });
}

export async function checkBudget(
  redis: Redis,
  userId: string,
  plan: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 4096,
): Promise<{ allowed: boolean; reason?: string; warning?: boolean; estimatedCostCents: number }> {
  if (plan === 'admin') {
    return { allowed: true, estimatedCostCents: 0 };
  }

  const model = getModelName();
  const limitCents = getMonthlyLimitCents(plan);

  if (limitCents === null) {
    return { allowed: true, estimatedCostCents: 0 };
  }

  const inputTokens = estimateInputTokens(systemPrompt, userPrompt);
  const outputTokens = estimateOutputTokens(maxOutputTokens);
  const estimatedCostCents = estimateCostCents(model, inputTokens, outputTokens);

  const costKey = `budget:cost:${userId}:${getMonthKey()}`;

  let result: unknown;
  try {
    result = await redis.eval(
      BUDGET_CHECK_SCRIPT,
      1,
      costKey,
      String(estimatedCostCents),
      plan,
      String(limitCents),
    );
  } catch {
    return {
      allowed: false,
      reason: 'BUDGET_CHECK_FAILED: Unable to verify budget. Please try again.',
      estimatedCostCents,
    };
  }

  if (result === 0) {
    emitLLMEvent(redis, 'blocked', { userId, costCents: estimatedCostCents, model });
    return {
      allowed: false,
      reason: `LLM_BUDGET_EXCEEDED: Monthly budget of $${(limitCents / 100).toFixed(2)} exhausted. Upgrade your plan.`,
      estimatedCostCents,
    };
  }

  if (result === 2) {
    emitLLMEvent(redis, 'warning', { userId, costCents: estimatedCostCents, model });
    return { allowed: true, warning: true, estimatedCostCents };
  }

  return { allowed: true, estimatedCostCents };
}

export async function recordUsage(
  redis: Redis,
  userId: string,
  actualTokens: number,
  actualCostCents: number,
  model: string,
  estimatedCostCents?: number,
): Promise<void> {
  if (actualTokens <= 0 && actualCostCents <= 0) return;

  if (estimatedCostCents !== undefined && estimatedCostCents > 0 && actualCostCents > 0) {
    const drift = Math.abs(actualCostCents - estimatedCostCents) / estimatedCostCents;
    if (drift > 0.5) {
      emitLLMEvent(redis, 'cost_drift', {
        userId,
        costCents: actualCostCents,
        estimatedCostCents,
        drift: Math.round(drift * 100),
        model,
      });
    }
  }

  await Promise.all([
    incrementMetric(redis, 'llm_cost_total', actualCostCents),
    incrementMetric(redis, 'llm_tokens_total', actualTokens),
  ]);

  await trackBudgetUsage(redis, userId, actualTokens, actualCostCents);

  emitLLMEvent(redis, 'usage', { userId, costCents: actualCostCents, tokens: actualTokens, model });
}

export async function trackBudgetUsage(
  redis: Redis,
  userId: string,
  tokens: number,
  costCents: number,
): Promise<void> {
  const monthKey = getMonthKey();
  const ttl = getMonthTTL();
  const multi = redis.multi();
  if (tokens > 0) {
    multi.incrby(`budget:tokens:${userId}:${monthKey}`, tokens);
    multi.expire(`budget:tokens:${userId}:${monthKey}`, ttl);
  }
  if (costCents > 0) {
    multi.incrbyfloat(`budget:cost:${userId}:${monthKey}`, costCents);
    multi.expire(`budget:cost:${userId}:${monthKey}`, ttl);
  }
  await multi.exec();
}
