import { getListingsAvailability, getListingsBookings } from "@/lib/bookings/queries";
import { getUserSummaries } from "@/lib/users/queries";
import { groupedLoader, keyedLoader } from "./loaders";

// No user here: resolvers read identity from the cookie through `authorize`.
export function createContext() {
  return {
    loaders: {
      listingBookings: groupedLoader(getListingsBookings, (booking) => booking.listing_id),
      listingAvailability: groupedLoader(getListingsAvailability, (range) => range.listing_id),
      userSummary: keyedLoader(getUserSummaries, (user) => user.id),
    },
  };
}

export type ApolloContext = ReturnType<typeof createContext>;
