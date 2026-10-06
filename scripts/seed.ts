// Demo data for the audited flows (booking, chat, login), consistent across Postgres and Mongo.
// Only seeds empty data tables; to start over, `pnpm db:reset --yes && pnpm db:seed`. See db/README.md.
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { MongoClient, ObjectId } from "mongodb";
import { Pool } from "pg";
import { refundFor } from "../lib/bookings/policy";
import { bookings } from "../lib/bookings/tables";
import type { BookingStatus } from "../lib/bookings/types";
import type { ChatDocument, MessageDocument, MessageReadCursor } from "../lib/chat/types";
import type { ListingDocumentValues } from "../lib/listings/types";
import { AMENITIES, PROPERTY_TYPES } from "../lib/listings/validation";
import type { NotificationDocument } from "../lib/notifications/types";
import { users } from "../lib/users/tables";

const DEMO_PASSWORD = "greenaway-demo";
const LISTING_COUNT = 30;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const HOSTS = [
  { name: "Lucía Fernández", email: "lucia@greenaway.test" },
  { name: "Martín Gómez", email: "martin@greenaway.test" },
  { name: "Sofía Romero", email: "sofia@greenaway.test" },
];

const GUESTS = [
  { name: "Valentina Díaz", email: "valentina@greenaway.test" },
  { name: "Joaquín Pereyra", email: "joaquin@greenaway.test" },
  { name: "Camila Sosa", email: "camila@greenaway.test" },
  { name: "Tomás Herrera", email: "tomas@greenaway.test" },
  { name: "Florencia Ruiz", email: "florencia@greenaway.test" },
  { name: "Nicolás Benítez", email: "nicolas@greenaway.test" },
];

const CITIES = [
  { city: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
  { city: "Córdoba", lat: -31.4201, lng: -64.1888 },
  { city: "Rosario", lat: -32.9442, lng: -60.6505 },
  { city: "Mendoza", lat: -32.8908, lng: -68.8272 },
  { city: "Bariloche", lat: -41.1335, lng: -71.3103 },
  { city: "Salta", lat: -24.7859, lng: -65.4116 },
  { city: "Ushuaia", lat: -54.8019, lng: -68.303 },
  { city: "Mar del Plata", lat: -38.0055, lng: -57.5426 },
];

const TITLES = [
  "Bright apartment downtown",
  "House with garden and pool",
  "Cabin in the woods",
  "Modern loft by the river",
  "Suite with a panoramic view",
  "Cozy studio in the old town",
  "Mountain country house",
  "Lakefront bungalow",
  "Penthouse with a private terrace",
  "Villa with its own vineyard",
];

const DESCRIPTIONS = [
  "A quiet place to rest and unplug, fully equipped with everything you need.",
  "Surrounded by nature, perfect for couples or families looking for a getaway.",
  "Contemporary design with noble materials, minutes away from the main sights.",
  "Bright and spacious, with a fully equipped kitchen and a dedicated workspace.",
  "Stunning views and direct access to trails and outdoor activities.",
];

const GUEST_LINES = [
  "Hi! I just booked these dates. Is early check-in possible?",
  "Thanks! Is there parking nearby?",
  "Perfect, we'll arrive around 3pm.",
  "Could you share the wifi details before we arrive?",
  "Any restaurant you'd recommend around the area?",
  "We loved the place, thanks for everything!",
];

const HOST_LINES = [
  "Hi, welcome! Early check-in should be fine, I'll confirm the day before.",
  "Yes, there's a free spot right in front of the building.",
  "Great, I'll leave the keys with the doorman.",
  "Sure, it's on the fridge too. Let me know if you need anything else.",
  "Don't miss the parrilla on the corner, best in town.",
  "Thank you for staying! You're welcome back anytime.",
];

const REJECT_REASONS = [
  "Those dates are blocked for maintenance, sorry!",
  "I can't host a group of that size, sorry.",
];

// Same copy the worker writes (greenaway-worker/src/notifications/booking.ts).
const NOTIFICATION_COPY = {
  created: { title: "New notification", body: (t: string) => `You have a new update related to "${t}".` },
  update: { title: "Booking confirmed", body: (t: string) => `There's an update on your booking for "${t}".` },
};

// Deterministic (mulberry32): the same shape on every run, relative to today.
let state = 20261006;
function random() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)];
const chance = (p: number) => random() < p;
function pickSome<T>(items: readonly T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = int(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const now = new Date();
const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const dayFromToday = (offset: number) => new Date(today + offset * DAY);
const notAfterNow = (date: Date) => new Date(Math.min(date.getTime(), now.getTime() - HOUR));

// `notifications.created_at` is read from the ObjectId: mint it at the event's time.
function objectIdAt(date: Date) {
  const seconds = Math.floor(date.getTime() / 1000).toString(16).padStart(8, "0");
  const rest = Array.from({ length: 16 }, () => int(0, 15).toString(16)).join("");
  return new ObjectId(seconds + rest);
}

type SeedListing = ListingDocumentValues & { _id: ObjectId };
type SeedBooking = typeof bookings.$inferInsert & { id: string; created_at: Date };
type SeedNotification = Omit<NotificationDocument, "_id" | "created_at"> & { _id: ObjectId };

function makeListing(hostId: string): SeedListing {
  const place = pick(CITIES);
  const beds = int(1, 4);
  const title = `${pick(TITLES)} in ${place.city}`;
  return {
    _id: new ObjectId(),
    type: "accommodation",
    host_id: hostId,
    title,
    description: pick(DESCRIPTIONS),
    price: int(4, 35) * 10,
    location: {
      type: "Point",
      coordinates: [place.lng + (random() - 0.5) * 0.1, place.lat + (random() - 0.5) * 0.1],
      city: place.city,
      country: "Argentina",
      address: `Calle ${int(100, 9999)}`,
    },
    attributes: {
      beds,
      bathrooms: int(1, 3),
      max_guests: beds * 2,
      check_in_time: pick(["13:00", "14:00", "15:00"]),
      check_out_time: pick(["10:00", "11:00"]),
      amenities: pickSome(AMENITIES, int(3, 7)),
      minimum_nights: pick([1, 2]),
      property_type: pick(PROPERTY_TYPES),
    },
    photos: Array.from(
      { length: int(2, 4) },
      (_, n) =>
        `https://dummyimage.com/1200x800/1f2a24/e8efe9.png&text=${encodeURIComponent(`${title} · ${n + 1}`)}`,
    ),
  };
}

// Disjoint windows per listing (days from today), so `no_overlap` always holds.
const SLOTS: { offset: number; nights: [number, number]; status: BookingStatus; p: number }[] = [
  { offset: -75, nights: [2, 5], status: "accepted", p: 0.7 },
  { offset: -40, nights: [2, 4], status: "accepted", p: 0.7 },
  { offset: -14, nights: [2, 4], status: "cancelled", p: 0.35 },
  { offset: -2, nights: [3, 5], status: "accepted", p: 0.3 },
  { offset: 8, nights: [2, 5], status: "accepted", p: 0.6 },
  { offset: 22, nights: [2, 4], status: "pending", p: 0.55 },
  { offset: 36, nights: [3, 5], status: "rejected", p: 0.25 },
];

function makeBookings(listing: SeedListing, guestIds: string[]): SeedBooking[] {
  return SLOTS.filter((slot) => chance(slot.p)).map((slot) => {
    const start = dayFromToday(slot.offset + int(0, 2));
    const nights = int(...slot.nights);
    const total = nights * listing.price;
    const created =
      slot.status === "pending"
        ? new Date(now.getTime() - int(2, 72) * HOUR)
        : notAfterNow(new Date(start.getTime() - int(5, 30) * DAY));
    const booking: SeedBooking = {
      id: randomUUID(),
      listing_id: listing._id.toHexString(),
      guest_id: pick(guestIds),
      start_date: start,
      end_date: new Date(start.getTime() + nights * DAY),
      guests: int(1, listing.attributes?.max_guests ?? 2),
      total_price: total,
      status: slot.status,
      created_at: created,
    };
    if (slot.status === "rejected") booking.status_reason = pick(REJECT_REASONS);
    if (slot.status === "cancelled") {
      const actor = chance(0.7) ? "guest" : "host";
      const at = notAfterNow(new Date(created.getTime() + int(1, 4) * DAY));
      booking.cancelled_by = actor;
      booking.cancelled_at = at;
      booking.refund_amount = refundFor({ status: "accepted", total_price: total, start_date: start }, actor, at);
    }
    return booking;
  });
}

// What the worker would have written for each transition: the party that didn't act gets it.
function makeNotifications(booking: SeedBooking, listing: SeedListing): SeedNotification[] {
  const notify = (recipient: string, at: Date, copy: typeof NOTIFICATION_COPY.created) => ({
    _id: objectIdAt(at),
    listing_id: booking.listing_id,
    host_id: listing.host_id,
    guest_id: recipient,
    booking_id: booking.id,
    target_id: recipient,
    title: copy.title,
    body: copy.body(listing.title),
    is_read: now.getTime() - at.getTime() > 3 * DAY,
  });

  const created = notify(listing.host_id, booking.created_at, NOTIFICATION_COPY.created);
  const answeredAt = notAfterNow(new Date(booking.created_at.getTime() + int(2, 24) * HOUR));
  switch (booking.status) {
    case "accepted":
    case "rejected":
      return [created, notify(booking.guest_id, answeredAt, NOTIFICATION_COPY.update)];
    case "cancelled": {
      const counterparty = booking.cancelled_by === "guest" ? listing.host_id : booking.guest_id;
      return [created, notify(counterparty, booking.cancelled_at as Date, NOTIFICATION_COPY.update)];
    }
    default:
      return [created];
  }
}

function makeChat(booking: SeedBooking, hostId: string) {
  const startedAt = notAfterNow(new Date(booking.created_at.getTime() + int(10, 120) * 60_000));
  const chat: Omit<ChatDocument, "_id"> = {
    booking_id: booking.id,
    guest_id: booking.guest_id,
    host_id: hostId,
    started_at: startedAt,
  };

  const messages: Omit<MessageDocument, "_id">[] = [];
  const turns = int(2, 6) * 2;
  let at = startedAt.getTime();
  for (let turn = 0; turn < turns && at < now.getTime(); turn++) {
    const fromGuest = turn % 2 === 0;
    const lines = fromGuest ? GUEST_LINES : HOST_LINES;
    messages.push({
      chat_id: booking.id,
      sender_id: fromGuest ? booking.guest_id : hostId,
      body: lines[Math.min(turn >> 1, lines.length - 1)],
      timestamp: new Date(at),
    });
    at += int(5, 600) * 60_000;
  }
  return { chat, messages };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const pool = new Pool({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5433,
    database: process.env.PGDATABASE,
  });
  const db = drizzle({ client: pool });
  const mongo = new MongoClient(uri);

  try {
    await mongo.connect();
    const listingsCol = mongo.db("listingsdb").collection<SeedListing>("listings");

    const [{ count }] = (await pool.query<{ count: string }>("SELECT count(*) FROM bookings")).rows;
    // Skipping (not failing) keeps `pnpm infra:up` safe to re-run on a seeded database.
    if (Number(count) > 0 || (await listingsCol.countDocuments()) > 0) {
      console.log("  – seed skipped: there is data already (`pnpm db:reset --yes` to start over)");
      return;
    }

    const password_hash = await hash(DEMO_PASSWORD, 10);
    const people = [
      ...HOSTS.map((user) => ({ ...user, is_host: true })),
      ...GUESTS.map((user) => ({ ...user, is_host: false })),
    ];
    await db
      .insert(users)
      .values(people.map((user) => ({ ...user, password_hash })))
      .onConflictDoNothing({ target: users.email });
    const seeded = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, people.map((user) => user.email)));
    const idOf = new Map(seeded.map((user) => [user.email, user.id]));
    const hostIds = HOSTS.map((host) => idOf.get(host.email)!);
    const guestIds = GUESTS.map((guest) => idOf.get(guest.email)!);

    const listings = Array.from({ length: LISTING_COUNT }, (_, i) => makeListing(hostIds[i % hostIds.length]));
    const seedBookings = listings.flatMap((listing) => makeBookings(listing, guestIds));
    const listingById = new Map(listings.map((listing) => [listing._id.toHexString(), listing]));

    const notifications = seedBookings.flatMap((booking) =>
      makeNotifications(booking, listingById.get(booking.listing_id)!),
    );
    const conversations = seedBookings
      .filter((booking) => booking.status !== "rejected" && chance(0.7))
      .map((booking) => makeChat(booking, listingById.get(booking.listing_id)!.host_id));
    const readCursors: MessageReadCursor[] = [...hostIds, ...guestIds].map((user_id) => ({
      user_id,
      last_seen_at: new Date(now.getTime() - int(1, 3) * DAY),
    }));

    await listingsCol.insertMany(listings);
    await db.insert(bookings).values(seedBookings);
    await mongo.db("notificationsdb").collection<SeedNotification>("notifications").insertMany(notifications);
    await mongo.db("chatsdb").collection<Omit<ChatDocument, "_id">>("chats").insertMany(conversations.map((c) => c.chat));
    await mongo
      .db("messagesdb")
      .collection<Omit<MessageDocument, "_id">>("messages")
      .insertMany(conversations.flatMap((c) => c.messages));
    for (const cursor of readCursors)
      await mongo
        .db("messagesdb")
        .collection<MessageReadCursor>("read_cursors")
        .updateOne({ user_id: cursor.user_id }, { $set: cursor }, { upsert: true });

    console.log(`  ✓ users:         ${people.length} (password: ${DEMO_PASSWORD})`);
    console.log(`  ✓ listings:      ${listings.length}`);
    console.log(`  ✓ bookings:      ${seedBookings.length}`);
    console.log(`  ✓ notifications: ${notifications.length}`);
    console.log(`  ✓ chats:         ${conversations.length} (${conversations.flatMap((c) => c.messages).length} messages)`);
  } finally {
    await mongo.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[seed]", error);
  process.exitCode = 1;
});
