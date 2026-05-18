import type Redis from 'ioredis';

export interface RedisHealthResult {
  connected: boolean;
  pingLatencyMs: number;
  memory: {
    usedBytes: number;
    peakBytes: number;
    fragmentationRatio: number;
  };
  failedCommands: number;
  totalCommands: number;
  hitRate: number;
  uptimeSeconds: number;
  clients: number;
}

export class RedisHealthMonitor {

  static async getHealth(redis: Redis): Promise<RedisHealthResult> {
    const start = Date.now();
    let pingOk = false;
    try {
      const pong = await redis.ping();
      pingOk = pong === 'PONG';
    } catch { /* ping failed */ }
    const pingLatencyMs = Date.now() - start;

    let infoMemory: Record<string, string> = {};
    let infoStats: Record<string, string> = {};
    let infoServer: Record<string, string> = {};
    let infoClients: Record<string, string> = {};
    try {
      const [mem, stats, srv, clients] = await Promise.all([
        redis.info('MEMORY'),
        redis.info('STATS'),
        redis.info('SERVER'),
        redis.info('CLIENTS'),
      ]);
      infoMemory = RedisHealthMonitor.parseInfo(mem);
      infoStats = RedisHealthMonitor.parseInfo(stats);
      infoServer = RedisHealthMonitor.parseInfo(srv);
      infoClients = RedisHealthMonitor.parseInfo(clients);
    } catch { /* info failed */ }

    const usedBytes = Number(infoMemory['used_memory']) || 0;
    const peakBytes = Number(infoMemory['used_memory_peak']) || 0;
    const fragRatio = Number(infoMemory['mem_fragmentation_ratio']) || 0;
    const totalCmds = Number(infoStats['total_commands_processed']) || 0;
    const failedCmds = Number(infoStats['total_error_replies']) || 0;
    const keysHits = Number(infoStats['keyspace_hits']) || 0;
    const keysMisses = Number(infoStats['keyspace_misses']) || 0;
    const totalOps = keysHits + keysMisses;
    const uptimeSec = Number(infoServer['uptime_in_seconds']) || 0;
    const clients = Number(infoClients['connected_clients']) || 0;

    return {
      connected: pingOk,
      pingLatencyMs,
      memory: { usedBytes, peakBytes, fragmentationRatio: fragRatio },
      failedCommands: failedCmds,
      totalCommands: totalCmds,
      hitRate: totalOps > 0 ? Math.round((keysHits / totalOps) * 10000) / 100 : 100,
      uptimeSeconds: uptimeSec,
      clients,
    };
  }

  private static parseInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of info.split('\r\n')) {
      if (line.startsWith('#')) continue;
      const idx = line.indexOf(':');
      if (idx > 0) {
        result[line.slice(0, idx)] = line.slice(idx + 1);
      }
    }
    return result;
  }
}
