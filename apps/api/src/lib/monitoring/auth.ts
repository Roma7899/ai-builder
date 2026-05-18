import type Redis from 'ioredis';
import { Baselines } from './baselines';

function minuteBucket(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

const FAILED_LOGIN_KEY = 'auth:failed:login';
const TOKEN_FAIL_KEY = 'auth:failed:token';
const REFRESH_FAIL_KEY = 'auth:failed:refresh';
const AUTH_ATTEMPTS_KEY = 'auth:attempts';
const BRUTE_FORCE_IP_PREFIX = 'auth:brute:ip:';

export class AuthMonitor {

  static async recordFailedLogin(redis: Redis, ip: string, email: string): Promise<void> {
    const mb = minuteBucket();
    const multi = redis.multi();
    multi.incr(`${FAILED_LOGIN_KEY}:${mb}`);
    multi.expire(`${FAILED_LOGIN_KEY}:${mb}`, 7200);
    multi.incr(`${AUTH_ATTEMPTS_KEY}:${mb}`);
    multi.expire(`${AUTH_ATTEMPTS_KEY}:${mb}`, 7200);
    multi.incr(`${BRUTE_FORCE_IP_PREFIX}${ip}:${mb}`);
    multi.expire(`${BRUTE_FORCE_IP_PREFIX}${ip}:${mb}`, 7200);
    await multi.exec();

    Baselines.updateBaseline(redis, 'auth', 1, '1h').catch(() => {});
  }

  static async recordTokenFailure(redis: Redis): Promise<void> {
    const mb = minuteBucket();
    const multi = redis.multi();
    multi.incr(`${TOKEN_FAIL_KEY}:${mb}`);
    multi.expire(`${TOKEN_FAIL_KEY}:${mb}`, 7200);
    multi.incr(`${AUTH_ATTEMPTS_KEY}:${mb}`);
    multi.expire(`${AUTH_ATTEMPTS_KEY}:${mb}`, 7200);
    await multi.exec();
  }

  static async recordRefreshFailure(redis: Redis): Promise<void> {
    const mb = minuteBucket();
    const multi = redis.multi();
    multi.incr(`${REFRESH_FAIL_KEY}:${mb}`);
    multi.expire(`${REFRESH_FAIL_KEY}:${mb}`, 7200);
    multi.incr(`${AUTH_ATTEMPTS_KEY}:${mb}`);
    multi.expire(`${AUTH_ATTEMPTS_KEY}:${mb}`, 7200);
    await multi.exec();
  }

  static async recordLoginAttempt(redis: Redis): Promise<void> {
    const mb = minuteBucket();
    const multi = redis.multi();
    multi.incr(`${AUTH_ATTEMPTS_KEY}:${mb}`);
    multi.expire(`${AUTH_ATTEMPTS_KEY}:${mb}`, 7200);
    await multi.exec();
  }

  static async getFailureRate(): Promise<{ failedLogin: number; tokenFailures: number; refreshFailures: number; totalAttempts: number; failureRate: number }> {
    return { failedLogin: 0, tokenFailures: 0, refreshFailures: 0, totalAttempts: 0, failureRate: 0 };
  }

  static async getMetrics(redis: Redis): Promise<Record<string, unknown>> {
    const now = new Date();
    const buckets5: string[] = [];
    for (let m = 0; m < 5; m++) {
      const d = new Date(now.getTime() - m * 60000);
      buckets5.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
    }

    const loginKeys = buckets5.map(b => `${FAILED_LOGIN_KEY}:${b}`);
    const tokenKeys = buckets5.map(b => `${TOKEN_FAIL_KEY}:${b}`);
    const refreshKeys = buckets5.map(b => `${REFRESH_FAIL_KEY}:${b}`);
    const attemptsKeys = buckets5.map(b => `${AUTH_ATTEMPTS_KEY}:${b}`);

    const [loginVals, tokenVals, refreshVals, attemptsVals] = await Promise.all([
      redis.mget(...loginKeys),
      redis.mget(...tokenKeys),
      redis.mget(...refreshKeys),
      redis.mget(...attemptsKeys),
    ]);

    const sum = (arr: (string | null)[]) => arr.reduce((a, v) => a + (Number(v) || 0), 0);
    const failedLogin = sum(loginVals);
    const tokenFailures = sum(tokenVals);
    const refreshFailures = sum(refreshVals);
    const totalAttempts = sum(attemptsVals);
    const failureRate = totalAttempts > 0 ? Math.round((failedLogin + tokenFailures + refreshFailures) / totalAttempts * 10000) / 100 : 0;

    const brutes = await AuthMonitor.detectBruteForce(redis);

    return { failedLogin, tokenFailures, refreshFailures, totalAttempts, failureRate, bruteForceIPs: brutes };
  }

  static async detectBruteForce(redis: Redis): Promise<Array<{ ip: string; attempts: number }>> {
    const mb = minuteBucket();
    let cursor = '0';
    const results: Array<{ ip: string; attempts: number }> = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${BRUTE_FORCE_IP_PREFIX}*:${mb}`, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          const v = Number(values[i]) || 0;
          if (v >= 5) {
            const ip = keys[i].slice(BRUTE_FORCE_IP_PREFIX.length, -mb.length - 1);
            results.push({ ip, attempts: v });
          }
        }
      }
    } while (cursor !== '0');
    return results;
  }
}
