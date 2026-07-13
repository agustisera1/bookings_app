import { Queue } from "bullmq";
import type { User } from "./types/user";
import type { ListingDocumentValues } from "./types/listing";
import { Booking } from "./types/booking";

// export const messagesQueue = new Queue("host-guest-messaging");
// export const notificationsQueue = new Queue("booking-notifications");
function getConnectionParams() {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT);
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USER;
  const params = { host, port, password, username };
  if (Object.values(params).some((val) => !val))
    throw new Error("[redis-queue]: Missing connection params");
  return params;
}

export const emailQueue = new Queue("emails", {
  connection: getConnectionParams(),
});

// The lifecycle stage the notification announces. Drives the subject line and
// copy in the worker's email template. Replicated verbatim in the worker
// (`src/lib.ts`) — see the mirror rule in `docs/bullmq-queues.md`.
export type NotificationType = "pending" | "approved" | "rejected" | "updated";

/**
 * Wire contract for an "emails" job, shared with the email worker.
 *
 * This snapshot crosses a process boundary — BullMQ serializes it to JSON in
 * Redis — so it carries ONLY the fields the email template renders, never full
 * DB rows. The host is reduced to its name on purpose: password hashes and the
 * rest of the user row must never travel on the queue (see `PublicUser`).
 *
 * A single `processorKey` covers every booking email; `type` selects which
 * lifecycle copy the worker renders. Dates are ISO strings because that's what
 * actually survives JSON transport.
 */
export type BookingEmailPayload = {
  processorKey: "notify-booking";
  type: NotificationType;
  guest: { email: string };
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: number;
    statusReason?: string;
  };
  host: { name: string };
  listing: {
    title: string;
    location: { address?: string; city?: string; country?: string };
  };
};

// Narrows rich domain objects down to the wire contract above. Pure and
// side-effect free: the single place that decides which fields the email needs.
export function toBookingEmailPayload(input: {
  type: NotificationType;
  guestEmail: string;
  // Same sub-shape as the wire contract, but `checkIn`/`checkOut` may still be
  // `Date` objects (create path) rather than ISO strings (persisted-row path).
  booking: Omit<BookingEmailPayload["booking"], "checkIn" | "checkOut"> & {
    checkIn: Date | string;
    checkOut: Date | string;
  };
  host: Pick<User, "name">;
  listing: Pick<ListingDocumentValues, "title" | "location">;
}): BookingEmailPayload {
  const { type, guestEmail, booking, host, listing } = input;
  return {
    processorKey: "notify-booking",
    type,
    guest: { email: guestEmail },
    booking: {
      id: booking.id,
      checkIn: new Date(booking.checkIn).toISOString(),
      checkOut: new Date(booking.checkOut).toISOString(),
      guests: booking.guests,
      totalPrice: booking.totalPrice,
    },
    host: { name: host.name },
    listing: {
      title: listing.title,
      location: {
        address: listing.location.address,
        city: listing.location.city,
        country: listing.location.country,
      },
    },
  };
}

// Welcome email sent once on sign-up. Minimal by the payload rules: the worker
// template only greets by email, so that's the only field that crosses the
// queue. Mirrored in the worker as `GreetingPayload` (src/lib.ts).
export type WelcomeEmailPayload = {
  processorKey: "greet-user";
  email: string;
};

// Narrows the freshly-created user row down to the wire contract above. Pure and
// side-effect free: the single place that decides which fields the email needs.
export function toWelcomeEmailPayload(input: {
  email: string;
}): WelcomeEmailPayload {
  return {
    processorKey: "greet-user",
    email: input.email,
  };
}

// Adapts a persisted PG booking row to the queue's booking sub-shape: string
// timestamps and a numeric-string `total_price` become the JSON-safe fields the
// email template expects. Derives from `BookingEmailPayload["booking"]` so the
// shape stays defined in exactly one place.
export function pgBookingToEmailBooking(
  booking: Booking,
): BookingEmailPayload["booking"] {
  return {
    id: booking.id,
    checkIn: new Date(booking.start_date).toISOString(),
    checkOut: new Date(booking.end_date).toISOString(),
    guests: booking.guests,
    totalPrice: Number(booking.total_price),
    statusReason: booking.status_reason || undefined,
  };
}
