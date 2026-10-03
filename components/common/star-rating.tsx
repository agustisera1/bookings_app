"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

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

// Controlled: owns only the hover state; the value lives with the caller (an RHF `Controller`).
export function StarRatingInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div
      data-slot="star-rating-input"
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-1", className)}
      onMouseLeave={() => setHovered(0)}
    >
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-safe:transition-transform motion-safe:hover:scale-110"
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
