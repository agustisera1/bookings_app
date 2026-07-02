import { Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { use } from "react";
import { ServiceResult } from "@/lib/types";
import { Review } from "@/lib/services/reviews";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{review.author_name}</span>
          <StarRating rating={review.rating} />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{date}</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {review.comment}
      </p>

      {review.host_reply && (
        <div className="ml-4 pl-3 border-l border-border flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Host reply
          </span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {review.host_reply}
          </p>
        </div>
      )}
    </div>
  );
}

export function ListingReviews({
  reviewsPromise,
}: {
  reviewsPromise: Promise<ServiceResult<Review[]>>;
}) {
  const reviewsResponse = use(reviewsPromise);

  if (!reviewsResponse.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load the reviews, please try reloading the page.
      </p>
    );
  }

  const reviews = reviewsResponse.data;

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Be the first to leave one!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {reviews.map((review, i) => (
        <div key={review.id}>
          <ReviewCard review={review} />
          {i < reviews.length - 1 && <Separator className="mt-6" />}
        </div>
      ))}
    </div>
  );
}
