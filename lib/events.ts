import { Queue, type JobsOptions } from "bullmq";
import type { User } from "./types/user";
import type { ListingDocumentValues } from "./types/listing";
import { Booking, BookingParty } from "./types/booking";
import { getRedisConnectionParams } from "./redis-config";

const connection = getRedisConnectionParams();

// Ver `docs/architecture/BULLMQ_QUEUES.md`.
const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  // Counts, no booleanos: `true` borra el job al instante y no deja ventana que
  // inspeccionar. También es lo que acota la dedup por `jobId`.
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export const notificationsQueue = new Queue("notifications", {
  connection,
  defaultJobOptions,
});

export const emailQueue = new Queue("emails", {
  connection,
  defaultJobOptions,
});

// The lifecycle stage the notification announces. Drives the subject line and
// copy in the worker's email template. Replicated verbatim in the worker
// (`src/lib.ts`) — see the mirror rule in `docs/architecture/BULLMQ_QUEUES.md`.
//
// Adding a member here is a breaking change for the worker: it indexes its copy
// and subject maps by this type, so it must learn the new member and be deployed
// BEFORE the API starts sending it, or the job throws and retries forever.
export type NotificationType =
  | "pending"
  | "approved"
  | "rejected"
  | "updated"
  | "cancelled";

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
    // Only meaningful on `cancelled`. The worker renders `refundAmount` as
    // given and never recomputes it — the 48h rule lives in
    // `lib/bookings/policy.ts`, and restating it there is how the two drift.
    refundAmount?: number;
    cancelledBy?: BookingParty;
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
    // Spread rather than re-listing each field: the input is already the wire
    // sub-shape (only the dates differ), so the only thing to do is normalize
    // them. Re-listing is what silently dropped `statusReason` — every optional
    // field added to the contract had to be remembered here too, and wasn't.
    booking: {
      ...booking,
      checkIn: new Date(booking.checkIn).toISOString(),
      checkOut: new Date(booking.checkOut).toISOString(),
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

// The kind of in-app notification the worker builds and persists to Mongo.
// Drives the title/body copy on the notification row (and whether it lands
// already-read). Replicated verbatim in the worker (`src/lib.ts`) — see the
// mirror rule in `docs/architecture/BULLMQ_QUEUES.md`.
export type InAppNotificationType =
  | "mark_as_read"
  | "notify_user"
  | "notify_booking_update";

/**
 * Wire contract for a "notifications" job, shared with the notifications worker.
 *
 * Minimal and JSON-safe: the worker rehydrates the listing and user from these
 * ids, so only the ids plus the discriminant `type` cross the queue — never the
 * rendered title/body (that copy is the worker's job) nor full DB rows.
 *
 * A single `processorKey` covers every in-app notification; `type` selects which
 * copy the worker renders, mirroring how `notify-booking` uses `NotificationType`.
 */
export type NotificationJobPayload = {
  processorKey: "send-notification";
  type: InAppNotificationType;
  listingId: string;
  bookingId: string;
  userId: string;
};

// Narrows the enqueue call down to the wire contract above. Pure and
// side-effect free: the single place that stamps the `processorKey`.
export function toNotificationPayload(input: {
  type: InAppNotificationType;
  listingId: string;
  bookingId: string;
  userId: string;
}): NotificationJobPayload {
  return {
    processorKey: "send-notification",
    type: input.type,
    listingId: input.listingId,
    bookingId: input.bookingId,
    userId: input.userId,
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
// timestamps and the numeric-string money columns (`total_price`,
// `refund_amount` — NUMERIC comes back as string from pg) become the JSON-safe
// fields the email template expects. Derives from `BookingEmailPayload["booking"]`
// so the shape stays defined in exactly one place.
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
    refundAmount: Number(booking.refund_amount),
    cancelledBy: booking.cancelled_by ?? undefined,
  };
}
