"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/field";
import { StarRatingInput } from "@/components/common/star-rating";
import { createReview } from "@/lib/services/reviews";

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Select a rating").max(5),
  comment: z.string().min(1, "Comment is required"),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;

export function ReviewForm({ listingId }: { listingId: string }) {
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

  async function onSubmit(data: ReviewFormValues) {
    const result = await createReview({ ...data, listing_id: listingId });
    if (!result.ok) {
      toast.error(result.error ?? "Could not submit your review");
      throw new Error(result.error);
    }
    toast.success("Review submitted. Thank you for your feedback!");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <FormField label="Rating" error={errors.rating?.message}>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <StarRatingInput value={field.value} onChange={field.onChange} />
          )}
        />
      </FormField>

      <FormField label="Comment" htmlFor="comment" error={errors.comment?.message}>
        <Textarea
          id="comment"
          rows={4}
          placeholder="Share your experience…"
          className="resize-none"
          {...register("comment")}
        />
      </FormField>

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
