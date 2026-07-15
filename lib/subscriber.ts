import { createClient, RedisClientType } from "redis";
import { getRedisConnectionParams } from "./redis-config";

// Singleton across HMR reloads: Next keeps the process alive between hot
// reloads, so without this guard each reload would leak a new Redis connection.
declare global {
  var notificationsSub: RedisClientType | undefined;
}

export async function getSubscriber() {
  if (!globalThis.notificationsSub) {
    const { host, port, username, password } = getRedisConnectionParams();
    // node-redis v6: host/port van dentro de `socket`; al tope se ignoran.
    const client = createClient({ socket: { host, port }, username, password });
    client.on("error", (e) => console.error("[notificationsSub]:", e));
    await client.connect();
    globalThis.notificationsSub = client;
  }

  return globalThis.notificationsSub;
}
