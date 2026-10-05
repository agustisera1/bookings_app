import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.int().min(1, "Select a rating").max(5),
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(256, "Keep it under 256 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const hostReplySchema = z
  .string()
  .trim()
  .min(1, "Reply is required")
  .max(256, "Keep it under 256 characters");
