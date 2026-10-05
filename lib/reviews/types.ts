import type { reviews } from "./tables";

export type Review = typeof reviews.$inferSelect;

export type NewReview = Pick<
  typeof reviews.$inferInsert,
  "listing_id" | "author_name" | "rating" | "comment"
>;
