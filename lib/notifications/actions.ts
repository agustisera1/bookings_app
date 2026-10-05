"use server";
import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths } from "@/lib/shared/revalidate";
import * as repo from "./repository";
import { notificationIdSchema } from "./validation";

export async function markAsRead(notificationId: string): Promise<ServiceResult<null>> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;

  const parsed = notificationIdSchema.safeParse(notificationId);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  try {
    await repo.updateNotification(parsed.data, auth.data.id, { is_read: true });
    revalidatePaths([{ path: "/notifications" }]);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[markAsRead]", error);
    return { ok: false, error: "Could not update the notification", code: "UNEXPECTED" };
  }
}
