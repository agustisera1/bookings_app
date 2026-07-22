import { headers } from "next/headers";

// IP del cliente para keyear cotas. `x-forwarded-for` es una lista separada por
// comas; el primero es el cliente original cuando lo setea un proxy de
// confianza — su confiabilidad depende de ese proxy. Ver
// docs/insights/SECURITY_LAYERS.md.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
