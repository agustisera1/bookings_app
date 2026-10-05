import type { Listing, Resolvers } from "@/lib/apollo/__generated__/resolvers-types";
import { toGraphQLError } from "@/lib/apollo/errors";
import * as listingsRepo from "@/lib/listings/repository";
import { getBooking, getListingAvailability, getListingBookings, getUserBookings } from "./queries";

export const bookingsResolvers: Resolvers = {
  Query: {
    booking: async (_, { id }) => {
      const result = await getBooking(id);
      if (!result.ok) throw toGraphQLError(result);
      const { booking, party, listing } = result.data;
      return { ...booking, party, listing: listing as Listing | null };
    },
    guestBookings: async () => {
      const result = await getUserBookings();
      if (!result.ok) throw toGraphQLError(result);

      // One batched lookup for every listing instead of a field resolver per booking.
      const listings = await listingsRepo.findListingsByIds(
        result.data.map(({ listing_id }) => listing_id),
      );
      const byId = new Map(listings.map((listing) => [listing._id, listing]));

      return result.data.flatMap((booking) => {
        const listing = byId.get(booking.listing_id);
        if (!listing) {
          console.error(`[guestBookings] booking ${booking.id} points at a missing listing`);
          return [];
        }
        return [{ ...booking, party: "guest" as const, listing: listing as Listing }];
      });
    },
  },
  Listing: {
    availability: async (listing) => {
      const result = await getListingAvailability(listing._id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data;
    },
    bookings: async (listing) => {
      const result = await getListingBookings(listing._id);
      if (!result.ok) throw toGraphQLError(result);
      return result.data.map((booking) => ({ ...booking, party: "host" as const }));
    },
  },
};
