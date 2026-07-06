import { Separator } from "@/components/ui/separator";
import { use } from "react";
import { ServiceResult } from "@/lib/types";
import { Review } from "@/lib/services/reviews";
import { ReviewReplyForm } from "@/components/reviews/review-reply-form";
import { StarRating } from "@/components/common/star-rating";

function ReviewCard({
  review,
  isHostMode,
}: {
  review: Review;
  isHostMode: boolean;
}) {
  const date = new Date(review.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-start gap-2">
        <span className="text-sm font-medium">{review.author_name}</span>
        <span className="text-xs text-muted-foreground">{date}</span>
        <StarRating rating={review.rating} />
      </div>

      <p className="text-sm text-muted-foreground leading-snug">
        {review.comment}
      </p>

      {review.host_reply && (
        <div className="ml-3 pl-2 border-l border-border flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            Host reply
          </span>
          <p className="text-sm text-muted-foreground leading-snug">
            {review.host_reply}
          </p>
        </div>
      )}

      {isHostMode && !review.host_reply && (
        <ReviewReplyForm reviewId={review.id} listingId={review.listing_id} />
      )}
    </div>
  );
}

export function ListingReviews({
  reviewsPromise,
  isHostMode = false,
}: {
  reviewsPromise: Promise<ServiceResult<Review[]>>;
  isHostMode?: boolean;
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
    <div className="flex flex-col gap-3">
      {reviews.map((review, i) => (
        <div key={review.id}>
          <ReviewCard review={review} isHostMode={isHostMode} />
          {i < reviews.length - 1 && <Separator className="mt-3" />}
        </div>
      ))}
    </div>
  );
}
