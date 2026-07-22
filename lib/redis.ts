import { createClient, RedisClientType } from "redis";
import { getRedisConnectionParams } from "./redis-config";

// Cliente de comandos, singleton across HMR (mismo patrón que `subscriber.ts`).
// No se puede reusar el subscriber: una conexión en modo pub/sub rechaza los
// comandos normales (INCR, EXPIRE, ...) que necesita el rate limiter.
declare global {
  var redisCommandClient: RedisClientType | undefined;
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (!globalThis.redisCommandClient) {
    const { host, port, username, password } = getRedisConnectionParams();
    const client = createClient({ socket: { host, port }, username, password });
    client.on("error", (e) => console.error("[redisCommandClient]:", e));
    await client.connect();
    globalThis.redisCommandClient = client;
  }

  return globalThis.redisCommandClient;
}
