import mongoClientPromise from "@/lib/mongo";
import { ObjectId } from "mongodb";
import type { NotificationDocument } from "../types/notification";

async function getCollection() {
  const client = await mongoClientPromise;
  // The stored `_id` is an ObjectId; the domain `NotificationDocument` exposes
  // it as a string. Omitting `_id` from the schema lets the driver type filters
  // with ObjectId, while callers project it back to a string on the way out.
  return client
    .db("notificationsdb")
    .collection<Omit<NotificationDocument, "_id" | "created_at">>(
      "notifications",
    );
}

export async function getNotifications(userId: string) {
  const client = await getCollection();
  // Both read and unread: the UI splits them into "new" vs. "older" sections.
  // `created_at` is derived from the ObjectId's embedded creation timestamp.
  const docs = await client
    .find({ target_id: userId })
    .sort({ _id: -1 })
    .toArray();
  return docs.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
    created_at: doc._id.getTimestamp().toISOString(),
  }));
}

export async function getNotificationsCount(userId: string) {
  const client = await getCollection();
  return client.countDocuments({ target_id: userId, is_read: false });
}

type UpdateNotificationFields = Pick<NotificationDocument, "is_read">;

export async function updateNotification(
  notificationId: string,
  userId: string,
  values: Partial<UpdateNotificationFields>,
) {
  if (Object.keys(values).length === 0) return false;

  const client = await getCollection();
  // Scoped by target_id so a user can only update their own notifications.
  const result = await client.updateOne(
    { _id: new ObjectId(notificationId), target_id: userId },
    { $set: values },
  );

  return result.modifiedCount > 0;
}
