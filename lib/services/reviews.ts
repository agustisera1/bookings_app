"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";
import * as reviewsRepo from "../repositories/reviews.pg";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as listingsRepo from "../repositories/listings.mongo";
import { isCompleted, toCompletableBooking } from "../bookings/policy";
import { revalidatePath } from "next/cache";

export type { Review } from "../types/review";

/**
 * A review belongs to a stay, so it's written from the booking: the listing is
 * read off the booking rather than trusted from the caller, and the same
 * `isCompleted` rule the UI uses decides whether there's anything to review.
 */
export async function createReview({
  bookingId,
  rating,
  comment,
}: {
  bookingId: string;
  rating: number;
  comment: string;
}): Promise<ServiceResult> {
  const auth = await authorize("reviews:create");
  if (!auth.ok) return auth;

  try {
    const booking = await bookingsRepo.getBookingById(bookingId);
    // A booking that isn't the caller's own reads the same as a missing one.
    if (!booking || booking.guest_id !== auth.data.id)
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    if (!isCompleted(toCompletableBooking(booking), new Date()))
      return {
        ok: false,
        error: "You can only review a stay once it's finished",
        code: "FORBIDDEN",
      };

    const review = await reviewsRepo.createReviewRecord({
      rating,
      comment,
      authorName: auth.data.name,
      listingId: booking.listing_id,
    });

    if (!review)
      return {
        ok: false,
        error: "Could not create the review",
        code: "UNEXPECTED",
      };

    revalidatePath("/listings");
    revalidatePath(`/listings/${booking.listing_id}`);
    revalidatePath(`/bookings/${bookingId}`);
    return { data: review, ok: true };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    console.error("[createReview]", error);
    return {
      ok: false,
      error: "Could not create the review",
      code,
    };
  }
}

export async function replyToReview(
  reviewId: string,
  listingId: string,
  reply: string,
): Promise<ServiceResult> {
  const auth = await authorize("reviews:reply");
  if (!auth.ok) return auth;
  try {
    const listing = await listingsRepo.findListingById(listingId);
    if (!listing || listing.host_id !== auth.data.id)
      return {
        ok: false,
        error: "You can only reply to reviews on your own listings",
        code: "FORBIDDEN",
      };

    const replied = await reviewsRepo.addReply({
      reviewId,
      reply,
    });
    if (!replied) {
      return {
        ok: false,
        error: "Reply was not successful",
        code: "UNEXPECTED",
      };
    }

    revalidatePath(`/listings/${listingId}`);
    return { ok: true, data: null };
  } catch (error) {
    const code = db.pgErrorToCode(error);
    console.error("[replyToReview]", error);
    return {
      code,
      error: "Could not reply to the review",
      ok: false,
    };
  }
}

export async function getListingReviews(
  listing_id: string,
): Promise<ServiceResult<import("../types/review").Review[]>> {
  const auth = await authorize("reviews:list");
  if (!auth.ok) return auth;

  try {
    const reviews = await reviewsRepo.findReviewsByListingId(listing_id);
    return { data: reviews, ok: true };
  } catch (error) {
    console.error("[getListingReviews]", error);
    return {
      ok: false,
      error: "Could not retrieve the reviews",
      code: db.pgErrorToCode(error),
    };
  }
}
