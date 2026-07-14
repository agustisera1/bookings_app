"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "../authorize";
import * as notificationsRepo from "../repositories/notifications.mongo";
import { ServiceResult } from "../types";
import { NotificationDocument } from "../types/notification";
import {
  notificationsQueue,
  toNotificationPayload,
  type InAppNotificationType,
} from "../events";

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

export async function markAsRead(
  notificationId: string,
): Promise<ServiceResult<null>> {
  const auth = await authorize("notifications:view");
  if (!auth.ok) return auth;
  try {
    await notificationsRepo.updateNotification(notificationId, auth.data.id, {
      is_read: true,
    });
    revalidatePath("/notifications");
    return { data: null, ok: true };
  } catch (error) {
    console.error("[markAsRead]", error);
    return {
      error: "Could not update the notification",
      code: "UNEXPECTED",
      ok: false,
    };
  }
}

type QueueNotificationParams = {
  type: InAppNotificationType;
  listingId: string;
  bookingId: string;
  userId: string;
};

export async function queueNotification(params: QueueNotificationParams) {
  await notificationsQueue.add("notifications", toNotificationPayload(params));
}
