"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createReview } from "@/lib/services/reviews";

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Select a rating").max(5),
  comment: z.string().min(1, "Comment is required"),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;

const STARS = [1, 2, 3, 4, 5];

export function ReviewForm({ listingId }: { listingId: string }) {
  const [hovered, setHovered] = useState(0);

  const {
    reset,
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: "" },
  });

  const rating = useWatch({ control, name: "rating" });

  async function onSubmit(data: ReviewFormValues) {
    const result = await createReview({ ...data, listing_id: listingId });
    if (!result.ok) {
      toast.error(result.error ?? "Could not submit your review");
      throw new Error(result.error);
    }
    toast.success("Review submitted. Thank you for your feedback!");
    reset();
  }

  const active = hovered || rating;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Rating</Label>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
              {STARS.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => field.onChange(star)}
                  onMouseEnter={() => setHovered(star)}
                  className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                >
                  <span
                    className={
                      active >= star
                        ? "text-yellow-400"
                        : "text-muted-foreground/30"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          )}
        />
        {errors.rating && (
          <p className="text-xs text-destructive">{errors.rating.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comment">Comment</Label>
        <textarea
          id="comment"
          rows={4}
          placeholder="Share your experience…"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          {...register("comment")}
        />
        {errors.comment && (
          <p className="text-xs text-destructive">{errors.comment.message}</p>
        )}
      </div>

      <Button
        variant="outline"
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
