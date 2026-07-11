import { Queue } from "bullmq";
import type { User } from "./types/user";
import type { ListingDocumentValues } from "./types/listing";

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

/**
 * Wire contract for an "emails" job, shared with the email worker.
 *
 * This snapshot crosses a process boundary — BullMQ serializes it to JSON in
 * Redis — so it carries ONLY the fields the email template renders, never full
 * DB rows. The host is reduced to its name on purpose: password hashes and the
 * rest of the user row must never travel on the queue (see `PublicUser`).
 *
 * Dates are ISO strings because that's what actually survives JSON transport.
 */
export type BookingEmailPayload = {
  processorKey: "notify-booking";
  guest: { email: string };
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: number;
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
  guestEmail: string;
  booking: {
    id: string;
    checkIn: Date | string;
    checkOut: Date | string;
    guests: number;
    totalPrice: number;
  };
  host: Pick<User, "name">;
  listing: Pick<ListingDocumentValues, "title" | "location">;
}): BookingEmailPayload {
  const { guestEmail, booking, host, listing } = input;
  return {
    processorKey: "notify-booking",
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
