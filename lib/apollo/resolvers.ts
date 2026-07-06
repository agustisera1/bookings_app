import type { Listing, Resolvers } from "./__generated__/resolvers-types";
import { toGraphQLError } from "./errors";
import { Booking, getUserBookings, GuestBooking } from "../services/bookings";
import {
  getListing,
  getListings,
  getListingsByIds,
} from "../services/listings";

export const resolvers: Resolvers = {
  Query: {
    listing: async (_, { listing_id }) => {
      const result = await getListing(listing_id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data as Listing | null;
    },
    listings: async (_, { limit, term, own }) => {
      const result = await getListings({ limit, term, own: !!own });
      if (!result.ok) throw toGraphQLError(result);
      return result.data as Listing[];
    },
    guestBookings: async () => {
      // 1. Search the guest bookings
      const userBookingsResult = await getUserBookings();
      if (!userBookingsResult.ok) throw toGraphQLError(userBookingsResult);
      const ids = (userBookingsResult.data as Booking[]).map(
        ({ listing_id }) => listing_id,
      );

      // 2. Search documents the guest booked listings
      const docsResult = await getListingsByIds(ids);
      if (!docsResult.ok) throw toGraphQLError(docsResult);
      const docs = docsResult.data;
      const bookings = userBookingsResult.data;

      return bookings
        .map(({ listing_id, ...booking }) => {
          const listing = docs.find(({ _id }) => listing_id === _id.toString());
          if (!listing) {
            console.error(
              `Mismatch between listing and booking: ${listing_id}`,
            );
            return undefined;
          } else
            return {
              type: listing.type,
              title: listing.title,
              created_at: booking.created_at,
              start_date: booking.start_date,
              end_date: booking.end_date,
              status: booking.status,
              total_price: parseFloat(booking.total_price),
              id: booking.id,
              guests: booking.guests,
            } as GuestBooking;
        })
        .filter((el) => !!el);
    },
  },
};
