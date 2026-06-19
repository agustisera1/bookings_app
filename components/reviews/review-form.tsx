"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

async function mockCreateReview(data: {
  listingId: string;
  rating: number;
  comment: string;
}) {
  await new Promise((r) => setTimeout(r, 800));
  console.log("[mock] createReview", data);
}

const STARS = [1, 2, 3, 4, 5];

export function ReviewForm({ listingId }: { listingId: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await mockCreateReview({ listingId, rating, comment });
    setPending(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <p className="text-sm text-center text-muted-foreground py-6">
        Review submitted. Thank you for your feedback.
      </p>
    );
  }

  const active = hovered || rating;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Rating</Label>
        <div
          className="flex gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {STARS.map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              className="text-2xl leading-none transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              <span className={active >= star ? "text-yellow-400" : "text-muted-foreground/30"}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comment">Comment</Label>
        <textarea
          id="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience…"
          required
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={pending || rating === 0}
        variant="outline"
        className="w-full"
      >
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
