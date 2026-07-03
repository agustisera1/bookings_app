import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingForm } from "@/components/bookings/booking-form";
import { ReviewForm } from "@/components/reviews/review-form";
import { MapPin, Star, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { query } from "@/lib/apollo/client";
import { GetListingDocument } from "@/lib/apollo/__generated__/operations";
import { getListingReviews } from "@/lib/services/reviews";
import { ListingReviews } from "@/components/reviews/listing-reviews";
import { getCurrentUser } from "@/lib/services/auth";
import { getListingBookings } from "@/lib/services/listings";
import { ListingBookings } from "@/components/bookings/listing-bookings";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    data: { listing },
    error,
  } = await query({
    query: GetListingDocument,
    variables: { listing_id: id },
  });

  if (error || listing === null) {
    return <div className="min-h-screen">Listing not found</div>;
  }

  const currentUser = await getCurrentUser();
  const isHostMode =
    !!currentUser?.is_host && currentUser.id === listing.host_id;

  const reviewsPromise = getListingReviews(id);
  const bookingsPromise = isHostMode ? getListingBookings(id) : undefined;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href={isHostMode ? "/listings/mine" : "/listings"}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors w-fit mb-6"
        >
          <ChevronLeft className="size-4" />
          Back to listings
        </Link>

        <div
          className={`grid grid-cols-1 gap-10 ${isHostMode ? "" : "lg:grid-cols-3"}`}
        >
          <div
            className={`flex flex-col gap-6 ${isHostMode ? "" : "lg:col-span-2"}`}
          >
            <div className="flex flex-col gap-2">
              <Badge
                variant="outline"
                className="uppercase tracking-widest text-[10px] w-fit"
              >
                {listing.type}
              </Badge>
              <div className="flex items-center justify-start gap-3">
                <h1 className="text-3xl font-heading font-semibold leading-tight">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">
                    {listing.rating_avg}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="size-3.5" />
                <span>
                  {listing.location?.city || "Location not specified"},{" "}
                  {listing.location?.country || "Country not specified"}
                </span>
              </div>
            </div>

            <Separator />

            <p className="text-muted-foreground leading-relaxed">
              {listing.description}
            </p>
          </div>

          {!isHostMode && (
            <div className="lg:col-span-1">
              <Card className="sticky top-6 max-w-md mx-auto lg:max-w-none">
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold">${listing.price}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      / night
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingForm
                    listingId={listing._id}
                    pricePerNight={listing.price}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Separator className="my-3" />

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-12">
          {!isHostMode && (
            <div className="flex flex-col gap-1 lg:w-1/2">
              <h2 className="text-3xl font-heading font-semibold">
                Leave a review
              </h2>
              <p className="text-sm text-muted-foreground">
                Share your experience to help other guests.
              </p>
              <ReviewForm listingId={listing._id} />
            </div>
          )}

          <div
            className={`flex flex-col gap-1 ${isHostMode ? "w-full" : "lg:w-1/2"}`}
          >
            <h2 className="text-3xl font-heading font-semibold">
              {isHostMode ? "Bookings" : "Other reviews"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isHostMode
                ? "Reservations guests have made for this listing"
                : "Check out other customer comments"}
            </p>
            {isHostMode && bookingsPromise ? (
              <ListingBookings bookingsPromise={bookingsPromise} />
            ) : (
              <ListingReviews reviewsPromise={reviewsPromise} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
