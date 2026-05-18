import type Redis from 'ioredis';
import { getRedis } from '../redisFactory';

interface SSECallback {
  (message: string): void;
}

interface ChannelEntry {
  callbacks: Set<SSECallback>;
  refCount: number;
}

export class SSEManager {
  private subscriber: Redis | null = null;
  private channels = new Map<string, ChannelEntry>();
  private initPromise: Promise<void> | null = null;

  private async ensureSubscriber(): Promise<Redis> {
    if (this.subscriber) return this.subscriber;
    if (this.initPromise) {
      await this.initPromise;
      return this.subscriber!;
    }
    this.initPromise = (async () => {
      const redis = getRedis().duplicate();
      redis.on('error', () => {});
      redis.on('message', (channel: string, message: string) => {
        const entry = this.channels.get(channel);
        if (entry) {
          for (const cb of entry.callbacks) {
            try { cb(message); } catch { /* swallow callback errors */ }
          }
        }
      });
      this.subscriber = redis;
    })();
    await this.initPromise;
    return this.subscriber!;
  }

  async subscribe(channel: string, callback: SSECallback): Promise<() => void> {
    const sub = await this.ensureSubscriber();

    let entry = this.channels.get(channel);
    if (!entry) {
      entry = { callbacks: new Set(), refCount: 0 };
      this.channels.set(channel, entry);
      await sub.subscribe(channel);
    }
    entry.callbacks.add(callback);
    entry.refCount++;

    return () => {
      if (!entry) return;
      entry.callbacks.delete(callback);
      entry.refCount--;
      if (entry.refCount <= 0 && this.subscriber) {
        this.channels.delete(channel);
        this.subscriber.unsubscribe(channel).catch(() => {});
      }
    };
  }

  async shutdown(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit().catch(() => {});
      this.subscriber = null;
    }
    this.channels.clear();
    this.initPromise = null;
  }
}

export const sseManager = new SSEManager();
