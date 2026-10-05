import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { BookingParty, BookingStatus } from "./types";
import { users } from "../users/tables";

const timestamptz = () => timestamp({ withTimezone: true, mode: "date" });

export const bookings = pgTable(
  "bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    // A Mongo ObjectId: no FK possible across databases.
    listing_id: varchar({ length: 24 }).notNull(),
    guest_id: uuid().notNull(),
    start_date: timestamptz().notNull(),
    end_date: timestamptz().notNull(),
    status: varchar({ length: 80 }).$type<BookingStatus>().notNull().default("pending"),
    status_reason: varchar({ length: 256 }),
    total_price: numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
    refund_amount: numeric({ precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    guests: smallint().notNull(),
    cancelled_by: varchar({ length: 10 }).$type<BookingParty>(),
    cancelled_at: timestamptz(),
    created_at: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name: "guest_fk", columns: [table.guest_id], foreignColumns: [users.id] })
      .onUpdate("cascade")
      .onDelete("restrict"),
    check(
      "booking_status_valid",
      sql`status IN ('pending', 'accepted', 'rejected', 'cancelled')`,
    ),
    check(
      "booking_cancelled_by_valid",
      sql`cancelled_by IS NULL OR cancelled_by IN ('guest', 'host')`,
    ),
    // Cancelling and recording who/when are the same write: a half-applied cancellation can't persist.
    check(
      "booking_cancellation_fields",
      sql`(status = 'cancelled' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)
        OR (status <> 'cancelled' AND cancelled_by IS NULL AND cancelled_at IS NULL)`,
    ),
    // The WHERE mirrors findBookedListingIds literally: a partial index is only used
    // when the query's WHERE implies its own.
    index("bookings_daterange_gist")
      .using("gist", sql`tstzrange(start_date, end_date, '[]')`)
      .where(sql`status NOT IN ('cancelled', 'rejected')`),
    index("bookings_guest_id_idx").on(table.guest_id),
    index("bookings_listing_id_idx").on(table.listing_id),
  ],
);
