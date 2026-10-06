"use server";
import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths } from "@/lib/shared/revalidate";
import * as repo from "./repository";
import { markAsReadSchema, type MarkAsReadInput } from "./validation";

const NOT_FOUND = { ok: false, error: "Notification not found", code: "NOT_FOUND" } as const;

export async function markAsRead(input: MarkAsReadInput): Promise<ServiceResult<null>> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;

  // The only field is the id: a malformed one names no notification.
  const parsed = markAsReadSchema.safeParse(input);
  if (!parsed.success) return NOT_FOUND;

  try {
    const found = await repo.updateNotification(parsed.data.notificationId, auth.data.id, {
      is_read: true,
    });
    if (!found) return NOT_FOUND;

    revalidatePaths([{ path: "/notifications" }]);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[markAsRead]", error);
    return { ok: false, error: "Could not update the notification", code: "UNEXPECTED" };
  }
}
