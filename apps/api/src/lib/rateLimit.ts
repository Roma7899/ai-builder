import type Redis from 'ioredis';

const CHECK_RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if tonumber(count) > tonumber(ARGV[1]) then
  return 0
end
return 1
`;

export async function checkRateLimit(
  redis: Redis,
  type: string,
  userId: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const key = `rate:${type}:${userId}:${windowSec}s`;
  const result = await redis.eval(CHECK_RATE_SCRIPT, 1, key, String(max), String(windowSec));
  return result === 1;
}
