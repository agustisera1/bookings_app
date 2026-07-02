import type { Listing, Resolvers } from "./__generated__/resolvers-types";
import { GraphQLError } from "graphql";
import { Booking, getUserBookings, GuestBooking } from "../services/bookings";
import {
  getListing,
  getListings,
  getListingsByIds,
} from "../services/listings";

export const resolvers: Resolvers = {
  Query: {
    listing: async (_, { listing_id }) => {
      try {
        return (await getListing(listing_id)) as Listing | null;
      } catch (error) {
        throw new GraphQLError("Failed to fetch listing detail", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    listings: async (_, { limit, term, own }) => {
      try {
        return (await getListings({ limit, term, own: !!own })) as Listing[];
      } catch (error) {
        throw new GraphQLError("Failed to fetch listings", {
          originalError: error instanceof Error ? error : undefined,
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    guestBookings: async () => {
      let ids: string[] = [];
      // 1. Search the guest bookings
      const userBookingsResult = await getUserBookings();
      if (!userBookingsResult.ok) {
        throw new Error("Error while retrieving user bookings");
      } else {
        ids = (userBookingsResult.data as Booking[]).map(
          ({ listing_id }) => listing_id,
        );
      }

      // 2. Search documents the guest booked listings
      const docs = await getListingsByIds(ids);
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
