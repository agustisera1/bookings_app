import { sql } from "drizzle-orm";
import { boolean, check, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: varchar({ length: 80 }).notNull(),
    password_hash: varchar({ length: 256 }).notNull(),
    name: varchar({ length: 80 }).notNull(),
    is_host: boolean().notNull().default(false),
    created_at: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("unique_email").on(table.email),
    // The server lowercases on the way in; this keeps any other writer from bypassing it.
    check("users_email_lowercase", sql`email = lower(email)`),
  ],
);
