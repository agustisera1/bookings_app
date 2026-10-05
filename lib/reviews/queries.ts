import { authorize } from "@/lib/authorize";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { Review } from "./types";

export async function getListingReviews(listingId: string): Promise<ServiceResult<Review[]>> {
  const auth = await authorize("reviews:list");
  if (!auth.ok) return auth;

  try {
    const reviews = await repo.findReviewsByListingId(listingId);
    return { ok: true, data: reviews };
  } catch (error) {
    console.error("[getListingReviews]", error);
    return { ok: false, error: "Could not retrieve the reviews", code: "UNEXPECTED" };
  }
}
