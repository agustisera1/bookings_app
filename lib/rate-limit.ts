import { getRedisClient } from "./redis";

// `failMode` = qué hacer si Redis no responde. Es una decisión de negocio que
// toma el caller, no el mecanismo. Ver docs/insights/SECURITY_LAYERS.md.
export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
  failMode: "open" | "closed";
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

// INCR + PEXPIRE (solo en el primer hit) + PTTL en un round trip atómico. El
// EXPIRE se setea únicamente cuando el contador nace, para que la ventana sea
// fija; hacerlo dentro del script evita la carrera de crashear entre el INCR y
// el EXPIRE y dejar la key sin TTL (contaría para siempre).
const FIXED_WINDOW = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('PTTL', KEYS[1])}
`;

export async function rateLimit(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  try {
    const client = await getRedisClient();
    const [count, ttl] = (await client.eval(FIXED_WINDOW, {
      keys: [key],
      arguments: [String(policy.windowMs)],
    })) as unknown as [number, number];

    const allowed = count <= policy.limit;
    // Verificación TD-20 (solo dev): ver el contador subir en cada intento.
    if (process.env.NODE_ENV !== "production")
      console.log(
        `[rateLimit] ${key} → ${count}/${policy.limit} ${allowed ? "OK" : "BLOCKED"}`,
      );
    return { allowed, retryAfterMs: allowed ? 0 : Math.max(ttl, 0) };
  } catch (error) {
    console.error("[rateLimit]", error);
    return { allowed: policy.failMode === "open", retryAfterMs: 0 };
  }
}

// Libera contadores tras un éxito legítimo (p. ej. un login OK): así solo los
// intentos fallidos consumen cuota. Best-effort — si Redis falla, se ignora.
export async function resetRateLimit(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const client = await getRedisClient();
    await client.del(keys);
  } catch (error) {
    console.error("[resetRateLimit]", error);
  }
}
