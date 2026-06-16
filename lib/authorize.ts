"use server";
import { getCurrentUser, type CurrentUser } from "./services/auth";
import type { ServiceResult } from "./types";

export async function authorize(
  permissionKey: string,
): Promise<ServiceResult<CurrentUser>> {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false, error: "Unauthenticated", code: "UNAUTHORIZED" };

  if (!user.permissions.includes(permissionKey))
    return { ok: false, error: "Forbidden", code: "FORBIDDEN" };

  return { ok: true, data: user };
}
