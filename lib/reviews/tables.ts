import { sql } from "drizzle-orm";
import { check, pgTable, smallint, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    // A Mongo ObjectId: no FK possible across databases.
    listing_id: varchar({ length: 24 }).notNull(),
    author_name: varchar({ length: 60 }).notNull(),
    rating: smallint().notNull(),
    comment: varchar({ length: 256 }).notNull(),
    host_reply: varchar({ length: 256 }),
    created_at: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [check("reviews_rating_range", sql`${table.rating} BETWEEN 1 AND 5`)],
);
