import Redis from 'ioredis';
import { config } from '../config';

interface RedisPoolEntry {
  redis: Redis;
  refCount: number;
}

const instances = new Map<string, RedisPoolEntry>();

function logRedisEvent(event: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...extra, timestamp: new Date().toISOString() }));
}

function createConnection(keyPrefix: string | undefined): Redis {
  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    keyPrefix,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      if (times > 10) {
        logRedisEvent('redis:failover', { attempts: times, keyPrefix });
        return null;
      }
      const delay = Math.min(Math.pow(2, times) * 200, 10000);
      logRedisEvent('redis:reconnect', { attempt: times, delay, keyPrefix });
      return delay;
    },
    lazyConnect: false,
  });

  redis.on('error', (err) => {
    logRedisEvent('redis:error', { message: err.message, keyPrefix });
  });

  redis.on('reconnecting', () => {
    logRedisEvent('redis:reconnecting', { keyPrefix });
  });

  return redis;
}

export function getRedis(keyPrefix?: string): Redis {
  const prefix = keyPrefix ?? config.redis.keyPrefix;
  let entry = instances.get(prefix);
  if (!entry) {
    const redis = createConnection(prefix);
    entry = { redis, refCount: 0 };
    instances.set(prefix, entry);
  }
  entry.refCount++;
  return entry.redis;
}

export function getBullRedis(): Redis {
  const key = '__bull__';
  let entry = instances.get(key);
  if (!entry) {
    const redis = createConnection(undefined);
    entry = { redis, refCount: 0 };
    instances.set(key, entry);
  }
  entry.refCount++;
  return entry.redis;
}

export function getBullRedisConfig(): { host: string; port: number; password: string | undefined; maxRetriesPerRequest: number } {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: 3,
  };
}

/** Returns true if Redis is reachable by issuing a PING. */
export async function checkRedisAvailable(redis: Redis): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export function releaseRedis(instance: Redis): void {
  for (const [prefix, entry] of instances) {
    if (entry.redis === instance) {
      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.redis.quit().catch(() => {});
        instances.delete(prefix);
      }
      return;
    }
  }
}

export async function shutdownAll(): Promise<void> {
  const entries = Array.from(instances.values());
  instances.clear();
  await Promise.allSettled(entries.map((e) => e.redis.quit().catch(() => {})));
}
