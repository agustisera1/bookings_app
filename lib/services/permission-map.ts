import type { ServiceResult } from "../types";
import {
  searchListings,
  viewListing,
  createListing,
  manageListing,
  createExtendedListing,
} from "./listings";
import { createBooking, cancelBooking, getUserBookings } from "./bookings";
import { createReview, replyToReview } from "./reviews";
import {
  accessAdminPanel,
  moderateContent,
  manageDisputes,
  getGlobalMetrics,
} from "./admin";

export const PERMISSION_ACTIONS: Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...params: any[]) => Promise<ServiceResult>
> = {
  "listings:search": searchListings,
  "listings:view": viewListing,
  "listings:create": createListing,
  "listings:manage-own": manageListing,
  "listings:create-extended": createExtendedListing,
  "bookings:create": createBooking,
  "bookings:cancel-own": cancelBooking,
  "bookings:view-own-listings": getUserBookings,
  "reviews:create": createReview,
  "reviews:reply": replyToReview,
  "admin:panel": accessAdminPanel,
  "admin:moderate-content": moderateContent,
  "admin:manage-disputes": manageDisputes,
  "admin:global-metrics": getGlobalMetrics,
};
