import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { UserSummary } from "./types";

export async function getUserSummary(
  userId: string,
): Promise<ServiceResult<UserSummary | null>> {
  const auth = await authorize("bookings:view-own-listings");
  if (!auth.ok) return auth;

  try {
    const user = await repo.findUserById(userId);
    return { ok: true, data: user && { id: user.id, name: user.name } };
  } catch (error) {
    console.error("[getUserSummary]", error);
    return { ok: false, error: "Could not retrieve the user", code: "UNEXPECTED" };
  }
}
