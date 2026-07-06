import * as db from "../postgres";
import type { Review } from "../types/review";

export async function findReviewsByListingId(
  listingId: string,
): Promise<Review[]> {
  const result = await db.query<Review>(
    `SELECT * FROM reviews WHERE listing_id = $1`,
    [listingId],
  );
  return result.rows;
}

export async function createReviewRecord(params: {
  rating: number;
  comment: string;
  authorName: string;
  listingId: string;
}): Promise<{ id: string } | null> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO reviews (rating, comment, author_name, listing_id)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    [params.rating, params.comment, params.authorName, params.listingId],
  );
  return result.rows[0] ?? null;
}

export async function addReply(params: {
  reviewId: string;
  reply: string;
}): Promise<boolean> {
  const result = await db.query(
    `
    UPDATE reviews SET host_reply=$1
    WHERE id = $2
  `,
    [params.reply, params.reviewId],
  );

  return (result.rowCount ?? 0) > 0;
}
