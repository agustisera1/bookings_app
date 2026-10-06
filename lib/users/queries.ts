import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { UserSummary } from "./types";

export async function getUserSummaries(userIds: string[]): Promise<ServiceResult<UserSummary[]>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    const users = await repo.findUsersByIds(userIds);
    return { ok: true, data: users.map(({ id, name }) => ({ id, name })) };
  } catch (error) {
    console.error("[getUserSummaries]", error);
    return { ok: false, error: "Could not retrieve the users", code: "UNEXPECTED" };
  }
}
