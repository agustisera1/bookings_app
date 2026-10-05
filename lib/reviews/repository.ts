import { eq } from "drizzle-orm";
import { db } from "@/lib/infra/postgres";
import { reviews } from "./tables";
import type { NewReview, Review } from "./types";

export async function findReviewsByListingId(listingId: string): Promise<Review[]> {
  return db.select().from(reviews).where(eq(reviews.listing_id, listingId));
}

export async function insertReview(review: NewReview): Promise<{ id: string }> {
  const [created] = await db.insert(reviews).values(review).returning({ id: reviews.id });
  return created;
}

export async function setHostReply(reviewId: string, reply: string): Promise<boolean> {
  const updated = await db
    .update(reviews)
    .set({ host_reply: reply })
    .where(eq(reviews.id, reviewId))
    .returning({ id: reviews.id });
  return updated.length > 0;
}
