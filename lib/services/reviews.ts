"use server";
import { authorize } from "../authorize";
import type { ServiceResult } from "../types";
import * as db from "../postgres";
import { getCurrentUser } from "./auth";
import { ReviewFormValues } from "@/components/reviews/review-form";
import { revalidatePath } from "next/cache";

export type Review = {
  id: string;
  rating: number;
  comment: string;
  listing_id: string;
  author_name: string;
  host_reply: string | null;
  created_at: string;
};

async function verifyGuest(userId: string, listingId: string) {
  // Ensure the guest had a booking for that listing at least
  const result = await db.query(
    `
    SELECT 1 FROM bookings
    WHERE guest_id = $1 AND listing_id = $2
    LIMIT 1
    `,
    [userId, listingId],
  );

  return result.rows;
}

export async function createReview({
  rating,
  comment,
  listing_id,
}: ReviewFormValues & { listing_id: string }): Promise<ServiceResult> {
  const auth = await authorize("reviews:create");
  if (!auth.ok) return auth;

  const user = await getCurrentUser();
  if (!user)
    return { ok: false, error: "User unauthenticated", code: "UNAUTHORIZED" };

  try {
    const bookings = await verifyGuest(user.id, listing_id);
    if (bookings.length === 0)
      return {
        ok: false,
        error:
          "You need a completed booking for this listing to leave a review",
        code: "FORBIDDEN",
      };

    const result = await db.query(
      `
      INSERT INTO reviews (rating, comment, author_name, listing_id)
      VALUES ($1,$2,$3,$4)
      RETURNING id
      `,
      [rating, comment, user.name, listing_id],
    );

    if (!result.rowCount) {
      return {
        ok: false,
        error: "Could not create the review",
        code: "UNEXPECTED",
      };
    }

    revalidatePath("/listings");
    revalidatePath(`/listings/${listing_id}`);
    return {
      data: result.rows,
      ok: true,
    };
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
): Promise<ServiceResult<Review[]>> {
  const auth = await authorize("reviews:list");
  if (!auth.ok) return auth;

  try {
    const result = await db.query(
      `
      SELECT * FROM reviews r
      WHERE $1 = listing_id
      `,
      [listing_id],
    );

    return {
      data: result.rows as Review[],
      ok: true,
    };
  } catch (error) {
    console.error("[getListingReviews]", error);
    return {
      ok: false,
      error: "Could not retrieve the reviews",
      code: db.pgErrorToCode(error),
    };
  }
}
