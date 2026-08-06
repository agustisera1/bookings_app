import type { Listing, Resolvers } from "./__generated__/resolvers-types";
import { toGraphQLError } from "./errors";
import {
  getBooking,
  getUserBookings,
  type Booking as BookingRecord,
  type BookingParty,
} from "../services/bookings";
import {
  getListing,
  getListings,
  getListingsByIds,
} from "../services/listings";
import { getUserSummary } from "../services/users";

// `total_price` and `refund_amount` are NUMERIC columns, which node-postgres
// hands back as strings to protect the decimals; Float is the wire type.
function toGraphQLBooking(
  booking: BookingRecord,
  party: BookingParty,
  listing: Listing | null,
) {
  return {
    id: booking.id,
    created_at: booking.created_at,
    start_date: booking.start_date,
    end_date: booking.end_date,
    guests: booking.guests,
    status: booking.status,
    status_reason: booking.status_reason,
    total_price: parseFloat(booking.total_price),
    refund_amount: parseFloat(booking.refund_amount),
    cancelled_by: booking.cancelled_by,
    cancelled_at: booking.cancelled_at,
    party,
    listing,
  };
}

export const resolvers: Resolvers = {
  Query: {
    listing: async (_, { listing_id }) => {
      const result = await getListing(listing_id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data as Listing | null;
    },
    listings: async (_, { filters = null }) => {
      // Availability filtering (excluding listings booked in the requested
      // date range) is handled inside the service, alongside the other filters.
      const result = await getListings(filters);
      if (!result.ok) throw toGraphQLError(result);
      return result.data as Listing[];
    },
    booking: async (_, { id }) => {
      const result = await getBooking(id);
      if (!result.ok) throw toGraphQLError(result);
      const { booking, party } = result.data;

      const listingResult = await getListing(booking.listing_id);
      if (!listingResult.ok) throw toGraphQLError(listingResult);

      return toGraphQLBooking(
        booking,
        party,
        listingResult.data as Listing | null,
      );
    },
    guestBookings: async () => {
      // 1. Search the guest bookings
      const userBookingsResult = await getUserBookings();
      if (!userBookingsResult.ok) throw toGraphQLError(userBookingsResult);
      const bookings = userBookingsResult.data;

      // 2. Search documents the guest booked listings
      const docsResult = await getListingsByIds(
        bookings.map(({ listing_id }) => listing_id),
      );
      if (!docsResult.ok) throw toGraphQLError(docsResult);
      const docs = docsResult.data as unknown as Listing[];

      return bookings
        .map((booking) => {
          const listing = docs.find(({ _id }) => booking.listing_id === _id);
          if (!listing) {
            console.error(
              `Mismatch between listing and booking: ${booking.listing_id}`,
            );
            return undefined;
          }
          return toGraphQLBooking(booking, "guest", listing);
        })
        .filter((el) => !!el);
    },
  },

  // A field resolver so the extra lookup only runs for a query that asks for
  // the host — the trips list doesn't.
  Booking: {
    host: async (parent) => {
      const hostId = parent.listing?.host_id;
      if (!hostId) return null;

      const result = await getUserSummary(hostId);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
  },
};
