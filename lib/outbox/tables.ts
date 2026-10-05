import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const timestamptz = () => timestamp({ withTimezone: true, mode: "string" });

export const outbox = pgTable(
  "outbox",
  {
    id: uuid().primaryKey().defaultRandom(),
    aggregate_type: varchar({ length: 40 }).notNull(),
    // Neither UUID nor FK on purpose: it points at bookings (UUID) and listings (ObjectId),
    // and an ON DELETE CASCADE would drop an event still waiting to be published.
    aggregate_id: varchar({ length: 36 }).notNull(),
    event_type: varchar({ length: 60 }).notNull(),
    payload: jsonb().notNull(),
    created_at: timestamptz().notNull().defaultNow(),
    published_at: timestamptz(),
  },
  // Partial over pending rows only: the table grows unbounded, the index the relay scans doesn't.
  (table) => [index("outbox_pending_idx").on(table.created_at).where(sql`published_at IS NULL`)],
);

export const processedEvents = pgTable(
  "processed_events",
  {
    event_id: uuid()
      .notNull()
      .references(() => outbox.id, { onDelete: "cascade" }),
    // Part of the key: one outbox row fans out to several consumers.
    consumer: varchar({ length: 40 }).notNull(),
    processed_at: timestamptz().notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.event_id, table.consumer] })],
);
