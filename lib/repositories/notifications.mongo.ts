import mongoClientPromise from "@/lib/mongo";
import type { NotificationDocument } from "../types/notification";

async function getCollection() {
  const client = await mongoClientPromise;
  return client
    .db("notificationsdb")
    .collection<NotificationDocument>("notifications");
}

export async function getNotifications(userId: string) {
  const client = await getCollection();
  const docs = await client
    .find({ target_id: userId, is_read: false })
    .sort({ _id: -1 })
    .toArray();
  return docs.map((doc) => ({ ...doc, _id: doc._id.toString() }));
}

export async function getNotificationsCount(userId: string) {
  const client = await getCollection();
  return client.countDocuments({ target_id: userId, is_read: false });
}
