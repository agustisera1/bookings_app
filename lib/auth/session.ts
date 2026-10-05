import { cookies } from "next/headers";
import type { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "@/lib/infra/jwt";
import type { ServiceResult } from "@/lib/shared/result";
import type { CurrentUser } from "./types";

// Decodes the access token cookie without hitting the DB. Null instead of
// throwing: it may have expired between proxy.ts's check and this call.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const decoded = verifyToken(token) as JwtPayload;
    return {
      id: decoded.user_id,
      email: decoded.email,
      name: decoded.name,
      is_host: decoded.is_host,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };
  } catch {
    return null;
  }
}

export async function authorize(
  permissionKey: string,
): Promise<ServiceResult<CurrentUser>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" };

  if (!user.permissions.includes(permissionKey))
    return { ok: false, error: "Forbidden", code: "FORBIDDEN" };

  return { ok: true, data: user };
}
