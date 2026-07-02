"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";
import * as reviewsRepo from "../repositories/reviews.pg";
import * as bookingsRepo from "../repositories/bookings.pg";
import { revalidatePath } from "next/cache";

export type { Review } from "../types/review";

export async function createReview({
  rating,
  comment,
  listing_id,
}: {
  rating: number;
  comment: string;
  listing_id: string;
}): Promise<ServiceResult> {
  const auth = await authorize("reviews:create");
  if (!auth.ok) return auth;

  try {
    const hasBooking = await bookingsRepo.hasGuestBookingForListing(
      auth.data.id,
      listing_id,
    );

    if (!hasBooking)
      return {
        ok: false,
        error:
          "You need a completed booking for this listing to leave a review",
        code: "FORBIDDEN",
      };

    const review = await reviewsRepo.createReviewRecord({
      rating,
      comment,
      authorName: auth.data.name,
      listingId: listing_id,
    });

    if (!review)
      return {
        ok: false,
        error: "Could not create the review",
        code: "UNEXPECTED",
      };

    revalidatePath("/listings");
    revalidatePath(`/listings/${listing_id}`);
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

export async function replyToReview(): Promise<ServiceResult> {
  const auth = await authorize("reviews:reply");
  if (!auth.ok) return auth;
  return { ok: true, data: null };
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
