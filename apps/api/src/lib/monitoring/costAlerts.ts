import type Redis from 'ioredis';

export interface CostAlert {
  id: string;
  type: 'daily_threshold' | 'user_spike' | 'endpoint_spike';
  severity: 'warning' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const COST_ALERTS_PREFIX = 'cost_alerts:';
const COST_ALERTS_LIST = 'cost_alerts:recent';
const COST_ALERTS_CONFIG_KEY = 'cost_alerts:config';

interface AlertConfig {
  dailyThresholdCents: number;
  userSpikeMultiplier: number;
  endpointSpikeMultiplier: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  dailyThresholdCents: 5000,
  userSpikeMultiplier: 3,
  endpointSpikeMultiplier: 3,
};

export class CostAlertManager {

  static async getConfig(redis: Redis): Promise<AlertConfig> {
    const raw = await redis.get(COST_ALERTS_CONFIG_KEY);
    if (raw) {
      try { return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }; } catch { /* fall through */ }
    }
    return DEFAULT_CONFIG;
  }

  static async setConfig(redis: Redis, config: Partial<AlertConfig>): Promise<void> {
    const current = await CostAlertManager.getConfig(redis);
    const merged = { ...current, ...config };
    await redis.set(COST_ALERTS_CONFIG_KEY, JSON.stringify(merged));
  }

  static async evaluate(redis: Redis): Promise<CostAlert[]> {
    const alerts: CostAlert[] = [];
    const config = await CostAlertManager.getConfig(redis);
    const now = new Date().toISOString();

    const key0 = `metrics:llm:cost_minute:${LLMMinuteBucket(0)}`;
    const keysPast = Array.from({ length: 9 }, (_, i) => `metrics:llm:cost_minute:${LLMMinuteBucket(i + 1)}`);
    const allKeys = [key0, ...keysPast];

    const values = await redis.mget(...allKeys);
    const costThisMin = Number(values[0]) || 0;
    const baselineTotal = values.slice(1).reduce((a, v) => a + (Number(v) || 0), 0);
    const baselineAvg = keysPast.length > 0 ? baselineTotal / keysPast.length : 0;

    const id = () => `alert:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    if (costThisMin > 0 && baselineAvg > 0 && costThisMin > config.endpointSpikeMultiplier * baselineAvg) {
      alerts.push({
        id: id(),
        type: 'endpoint_spike',
        severity: 'warning',
        message: `LLM cost spike: ${Math.round(costThisMin * 100) / 100}¢ vs baseline ${Math.round(baselineAvg * 100) / 100}¢`,
        details: { costThisMin, baselineAvg, multiplier: Math.round(costThisMin / baselineAvg * 10) / 10 },
        timestamp: now,
      });
    }

    const todayCost = await CostAlertManager.getDailyCost(redis);
    if (todayCost > config.dailyThresholdCents) {
      alerts.push({
        id: id(),
        type: 'daily_threshold',
        severity: 'critical',
        message: `Daily LLM cost ${Math.round(todayCost * 100) / 100}¢ exceeds threshold ${config.dailyThresholdCents}¢`,
        details: { todayCost, threshold: config.dailyThresholdCents },
        timestamp: now,
      });
    }

    if (alerts.length > 0) {
      const multi = redis.multi();
      for (const alert of alerts) {
        multi.lpush(COST_ALERTS_LIST, JSON.stringify(alert));
      }
      multi.ltrim(COST_ALERTS_LIST, 0, 99);
      multi.expire(COST_ALERTS_LIST, 86400 * 3);
      await multi.exec();
    }

    return alerts;
  }

  static async getRecentAlerts(redis: Redis, limit = 20): Promise<CostAlert[]> {
    const raw = await redis.lrange(COST_ALERTS_LIST, 0, limit - 1);
    return raw.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  }

  static async getDailyCost(redis: Redis): Promise<number> {
    const now = new Date();
    let total = 0;
    for (let m = 0; m < 1440; m++) {
      const d = new Date(now.getTime() - m * 60000);
      if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) break;
      const b = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const raw = await redis.get(`metrics:llm:cost_minute:${b}`);
      if (raw) total += Number(raw);
    }
    return total;
  }
}

function LLMMinuteBucket(offset: number): string {
  const n = new Date(Date.now() - offset * 60000);
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}
