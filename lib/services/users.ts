"use server";
import * as usersRepo from "../repositories/users.pg";
import type { ServiceResult } from "../types";
import type { UserSummary } from "../types/user";

export type { UserSummary } from "../types/user";

/**
 * A user as the other party to a booking may see them. No `authorize` gate on
 * purpose — same reading as `getListing`: what makes this safe is the
 * projection, not a permission. Only `id` and `name` ever leave here, so there
 * is nothing to withhold from a caller who already reached the booking.
 */
export async function getUserSummary(
  userId: string,
): Promise<ServiceResult<UserSummary | null>> {
  try {
    const user = await usersRepo.findUserById(userId);
    if (!user) return { ok: true, data: null };
    return { ok: true, data: { id: user.id, name: user.name } };
  } catch (error) {
    console.error("[getUserSummary]", error);
    return {
      ok: false,
      error: "Could not retrieve the user",
      code: "UNEXPECTED",
    };
  }
}
