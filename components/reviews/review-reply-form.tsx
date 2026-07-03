"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { replyToReview } from "@/lib/services/reviews";

const replySchema = z.object({
  reply: z.string().min(1, "Reply is required"),
});

export type ReviewReplyFormValues = z.infer<typeof replySchema>;

export function ReviewReplyForm({
  reviewId,
  listingId,
}: {
  reviewId: string;
  listingId: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ReviewReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { reply: "" },
  });

  async function onSubmit(data: ReviewReplyFormValues) {
    const result = await replyToReview(reviewId, listingId, data.reply);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Reply submitted");
  }

  if (isSubmitSuccessful) {
    return (
      <p className="border-l border-border text-sm text-muted-foreground">
        Your reply has been submitted.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-l border-border flex flex-col gap-2"
    >
      <textarea
        rows={2}
        placeholder="Write a reply to this review…"
        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
        {...register("reply")}
      />
      {errors.reply && (
        <p className="text-xs text-destructive">{errors.reply.message}</p>
      )}
      <Button
        variant="outline"
        size="sm"
        type="submit"
        disabled={isSubmitting}
        className="w-fit self-end"
      >
        {isSubmitting ? "Submitting…" : "Reply"}
      </Button>
    </form>
  );
}
