export interface ModelPricing {
  inputPer1K: number;
  outputPer1K: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o':             { inputPer1K: 0.0025, outputPer1K: 0.01 },
  'gpt-4o-mini':        { inputPer1K: 0.00015, outputPer1K: 0.0006 },
  'claude-sonnet-4-20250514': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-haiku-3-5':   { inputPer1K: 0.0008, outputPer1K: 0.004 },
};

export const PLAN_MONTHLY_LIMIT_CENTS: Record<string, number | null> = {
  free:  100,     // $1
  pro:   2000,    // $20
  scale: null,    // no limit
  admin: null,    // bypass
};

export function estimateTokenCount(text: string, weight = 1): number {
  return Math.ceil(Math.ceil((text.length / 4) * 1.3) * weight);
}

export function estimateInputTokens(systemPrompt: string, userPrompt: string): number {
  return estimateTokenCount(systemPrompt, 1.5) + estimateTokenCount(userPrompt, 1);
}

export function estimateOutputTokens(maxOutputTokens: number): number {
  return Math.ceil(maxOutputTokens * 1.2);
}

export function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model];
  if (!pricing) {
    return 0;
  }
  const inputCost = (inputTokens / 1000) * pricing.inputPer1K;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1K;
  const totalUsd = inputCost + outputCost;
  return Math.ceil(totalUsd * 100);
}

export function getMonthlyLimitCents(plan: string): number | null {
  return PLAN_MONTHLY_LIMIT_CENTS[plan] ?? null;
}

export function getModelName(): string {
  return process.env.LLM_PROVIDER === 'anthropic'
    ? (process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514')
    : (process.env.OPENAI_MODEL ?? 'gpt-4o');
}
