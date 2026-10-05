import { authorize } from "@/lib/auth/session";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { NotificationDocument } from "./types";

export async function getUserNotifications(): Promise<ServiceResult<NotificationDocument[]>> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;

  try {
    const notifications = await repo.getNotifications(auth.data.id);
    return { ok: true, data: notifications };
  } catch (error) {
    console.error("[getUserNotifications]", error);
    return { ok: false, error: "Could not retrieve your notifications", code: "UNEXPECTED" };
  }
}

export async function getNotificationsCount(): Promise<ServiceResult<number>> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;

  try {
    const count = await repo.getNotificationsCount(auth.data.id);
    return { ok: true, data: count };
  } catch (error) {
    console.error("[getNotificationsCount]", error);
    return { ok: false, error: "Could not retrieve your notifications", code: "UNEXPECTED" };
  }
}
