"use server";
import { authorize } from "@/lib/authorize";
import { isCompleted, toCompletableBooking } from "@/lib/bookings/policy";
import * as bookingsRepo from "@/lib/repositories/bookings.pg";
import * as listingsRepo from "@/lib/repositories/listings.mongo";
import type { ServiceResult } from "@/lib/shared/result";
import { revalidatePaths } from "@/lib/shared/revalidate";
import * as repo from "./repository";
import { createReviewSchema, hostReplySchema, type CreateReviewInput } from "./validation";

export async function createReview(
  input: CreateReviewInput,
): Promise<ServiceResult<{ id: string }>> {
  const auth = await authorize("reviews:create");
  if (!auth.ok) return auth;

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  const { bookingId, rating, comment } = parsed.data;

  try {
    const booking = await bookingsRepo.getBookingById(bookingId);
    // Someone else's booking reads the same as a missing one.
    if (!booking || booking.guest_id !== auth.data.id)
      return { ok: false, error: "Booking not found", code: "NOT_FOUND" };

    if (!isCompleted(toCompletableBooking(booking), new Date()))
      return {
        ok: false,
        error: "You can only review a stay once it's finished",
        code: "FORBIDDEN",
      };

    const review = await repo.insertReview({
      listing_id: booking.listing_id,
      author_name: auth.data.name,
      rating,
      comment,
    });

    revalidatePaths([
      { path: "/listings" },
      { path: `/listings/${booking.listing_id}` },
      { path: `/bookings/${bookingId}` },
    ]);
    return { ok: true, data: review };
  } catch (error) {
    console.error("[createReview]", error);
    return { ok: false, error: "Could not create the review", code: "UNEXPECTED" };
  }
}

export async function replyToReview(
  reviewId: string,
  listingId: string,
  reply: string,
): Promise<ServiceResult<null>> {
  const auth = await authorize("reviews:reply");
  if (!auth.ok) return auth;

  const parsed = hostReplySchema.safeParse(reply);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };

  try {
    const listing = await listingsRepo.findListingById(listingId);
    if (listing?.host_id !== auth.data.id)
      return {
        ok: false,
        error: "You can only reply to reviews on your own listings",
        code: "FORBIDDEN",
      };

    const replied = await repo.setHostReply(reviewId, parsed.data);
    if (!replied) return { ok: false, error: "Review not found", code: "NOT_FOUND" };

    revalidatePaths([{ path: `/listings/${listingId}` }]);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[replyToReview]", error);
    return { ok: false, error: "Could not reply to the review", code: "UNEXPECTED" };
  }
}
