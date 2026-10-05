export type RedisConnectionParams = {
  host: string;
  port: number;
  username: string;
  password: string;
};

// Single source of truth for the Redis connection params, read from env and
// validated once. Two clients consume it with different shapes: BullMQ
// (`lib/events.ts`) takes host/port at the top level, while the node-redis SSE
// subscriber (`lib/subscriber.ts`) nests them under `socket`.
export function getRedisConnectionParams(): RedisConnectionParams {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT);
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USER;
  const params = { host, port, username, password };
  if (Object.values(params).some((val) => !val)) {
    throw new Error("[redis-config]: Missing connection params");
  }
  return params as RedisConnectionParams;
}
