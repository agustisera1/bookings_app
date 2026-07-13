import { authorize } from "../authorize";
import * as notificationsRepo from "../repositories/notifications.mongo";
import { ServiceResult } from "../types";
import { NotificationDocument } from "../types/notification";

export type { NotificationDocument } from "../types/notification";

export async function getNotificationsCount(): Promise<ServiceResult<number>> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;
  try {
    const count = await notificationsRepo.getNotificationsCount(auth.data.id);
    return { data: count, ok: true };
  } catch (error) {
    console.error(
      "[getNotificationsCount]: Could not retrieve the user notifications",
      error,
    );
    return {
      error: "Could not retrieve the user notifications",
      code: "UNEXPECTED",
      ok: false,
    };
  }
}

export async function getUserNotifications(): Promise<
  ServiceResult<NotificationDocument[]>
> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;
  try {
    const rows = await notificationsRepo.getNotifications(auth.data.id);
    return { data: rows, ok: true };
  } catch (error) {
    console.error(
      "[getUserNotifications]: Could not retrieve the user notifications",
      error,
    );
    return {
      error: "Could not retrieve the user notifications",
      code: "UNEXPECTED",
      ok: false,
    };
  }
}
