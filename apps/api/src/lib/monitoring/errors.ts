import type Redis from 'ioredis';
import crypto from 'node:crypto';

export interface ErrorGroup {
  hash: string;
  message: string;
  endpoint: string;
  stack: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  affectedUsers: string[];
  trend: Array<{ bucket: string; count: number }>;
}

const ERROR_GROUP_PREFIX = 'error_groups:';
const ERROR_RECENT_LIST = 'error_groups:recent';

function fingerprint(message: string, endpoint: string, stack: string): string {
  const stackFingerprint = stack.split('\n').slice(0, 3).join('\n');
  return crypto.createHash('sha256').update(`${message}|${endpoint}|${stackFingerprint}`).digest('hex').slice(0, 16);
}

function minuteBucket(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

export class ErrorGrouper {

  static async recordError(redis: Redis, message: string, endpoint: string, stack: string, requestPath?: string, userId?: string): Promise<void> {
    const hash = fingerprint(message, endpoint, stack);
    const key = `${ERROR_GROUP_PREFIX}${hash}`;
    const now = new Date().toISOString();

    const multi = redis.multi();
    multi.hset(key, { hash, message, endpoint: endpoint || requestPath || '', stack: stack.split('\n').slice(0, 5).join('\n'), lastSeen: now });
    multi.hincrby(key, 'count', 1);
    multi.expire(key, 86400 * 7);

    const exists = await redis.hexists(key, 'firstSeen');
    if (!exists) multi.hset(key, 'firstSeen', now);

    if (userId) {
      const usersKey = `${key}:users`;
      multi.sadd(usersKey, userId);
      multi.scard(usersKey);
      multi.expire(usersKey, 86400 * 7);
    }

    const trendMb = minuteBucket();
    const trendKey = `${key}:trend:${trendMb}`;
    multi.incr(trendKey);
    multi.expire(trendKey, 7200);

    multi.lpush(ERROR_RECENT_LIST, JSON.stringify({ hash, message, endpoint: endpoint || requestPath || '', timestamp: now }));
    multi.ltrim(ERROR_RECENT_LIST, 0, 499);
    multi.expire(ERROR_RECENT_LIST, 86400);

    await multi.exec();
  }

  static async getTopErrors(redis: Redis, limit = 10): Promise<ErrorGroup[]> {
    let cursor = '0';
    const groups: ErrorGroup[] = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${ERROR_GROUP_PREFIX}????????????????`, 'COUNT', 500);
      cursor = nextCursor;
      if (keys.length > 0) {
        const hashes = await Promise.all(keys.map(k => redis.hgetall(k)));
        const usersPromises = keys.map(k => redis.smembers(`${k}:users`).then(users => users.slice(0, 100)).catch(() => []));
        const usersResults = await Promise.all(usersPromises);

        for (let i = 0; i < hashes.length; i++) {
          const h = hashes[i];
          if (h && h.hash) {
            const trend = await ErrorGrouper._getTrend(redis, keys[i]);
            groups.push({
              hash: h.hash,
              message: h.message || '',
              endpoint: h.endpoint || '',
              stack: h.stack || '',
              count: Number(h.count) || 0,
              firstSeen: h.firstSeen || '',
              lastSeen: h.lastSeen || '',
              affectedUsers: usersResults[i] || [],
              trend,
            });
          }
        }
      }
    } while (cursor !== '0');
    groups.sort((a, b) => b.count - a.count);
    return groups.slice(0, limit);
  }

  private static async _getTrend(redis: Redis, key: string): Promise<Array<{ bucket: string; count: number }>> {
    const now = new Date();
    const trend: Array<{ bucket: string; count: number }> = [];
    for (let m = 0; m < 60; m++) {
      const d = new Date(now.getTime() - m * 60000);
      const b = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const raw = await redis.get(`${key}:trend:${b}`);
      const count = Number(raw) || 0;
      if (count > 0) trend.push({ bucket: b, count });
    }
    return trend.sort((a, b) => a.bucket.localeCompare(b.bucket)).slice(-10);
  }

  static async getRecentErrors(redis: Redis, limit = 20): Promise<Array<{ hash: string; message: string; endpoint: string; timestamp: string }>> {
    const raw = await redis.lrange(ERROR_RECENT_LIST, 0, limit - 1);
    return raw.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
  }
}
