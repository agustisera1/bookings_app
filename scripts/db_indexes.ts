// Every Mongo index lives here, nowhere else. Idempotent: `pnpm db:indexes` can run any number
// of times. Criteria in `.claude/rules/04-datos.md`.
import { MongoClient, type IndexDescription } from "mongodb";

type CollectionIndexes = { db: string; collection: string; indexes: IndexDescription[] };

const SCHEMA: CollectionIndexes[] = [
  {
    db: "listingsdb",
    collection: "listings",
    indexes: [
      { key: { host_id: 1 }, name: "host_id" },
      // `$text` fails without it: search can't run on a fresh database.
      { key: { title: "text", description: "text" }, name: "title_description_text" },
    ],
  },
  {
    db: "chatsdb",
    collection: "chats",
    indexes: [
      // Makes the worker's upsert by booking atomic: one chat per booking.
      { key: { booking_id: 1 }, name: "booking_id_unique", unique: true },
      { key: { guest_id: 1 }, name: "guest_id" },
      { key: { host_id: 1 }, name: "host_id" },
    ],
  },
  {
    db: "messagesdb",
    collection: "messages",
    indexes: [{ key: { chat_id: 1, timestamp: -1 }, name: "chat_id_timestamp" }],
  },
  {
    db: "messagesdb",
    collection: "read_cursors",
    indexes: [{ key: { user_id: 1 }, name: "user_id_unique", unique: true }],
  },
  {
    db: "notificationsdb",
    collection: "notifications",
    indexes: [
      { key: { target_id: 1, is_read: 1 }, name: "target_id_is_read" },
      // The worker's insert is also its claim on the event. Partial: seeded documents have no `event_id`.
      {
        key: { event_id: 1 },
        name: "event_id_unique",
        unique: true,
        partialFilterExpression: { event_id: { $exists: true } },
      },
    ],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    for (const { db, collection, indexes } of SCHEMA) {
      const names = await client.db(db).collection(collection).createIndexes(indexes);
      console.log(`  ✓ ${db}.${collection}: ${names.join(", ")}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
