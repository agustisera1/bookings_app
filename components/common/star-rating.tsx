"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

/**
 * Read-only star rating for displaying a score. Purely presentational.
 */
export function StarRating({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div
      data-slot="star-rating"
      className={cn("flex gap-0.5", className)}
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {STARS.map((star) => (
        <Star
          key={star}
          className={cn(
            "size-3.5",
            star <= rating
              ? "fill-rating text-rating"
              : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Interactive star picker. Controlled: owns only the ephemeral hover state,
 * the selected value lives with the caller (e.g. an RHF `Controller`).
 *
 * ```tsx
 * <Controller
 *   control={control}
 *   name="rating"
 *   render={({ field }) => (
 *     <StarRatingInput value={field.value} onChange={field.onChange} />
 *   )}
 * />
 * ```
 */
export function StarRatingInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div
      data-slot="star-rating-input"
      className={cn("flex gap-1", className)}
      onMouseLeave={() => setHovered(0)}
    >
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          className="rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Star
            className={cn(
              "size-6",
              active >= star
                ? "fill-rating text-rating"
                : "fill-muted text-muted-foreground/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}
