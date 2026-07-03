import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/common/section";
import { PriceLabel } from "@/components/common/price-label";
import { Separator } from "@/components/ui/separator";
import { BookingForm } from "@/components/bookings/booking-form";
import { ReviewForm } from "@/components/reviews/review-form";
import { ListingPhotos } from "@/components/listings/listing-photos";
import { EditListingButton } from "@/components/listings/edit-listing-button";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <Badge
                  variant="outline"
                  className="uppercase tracking-widest text-[10px] w-fit"
                >
                  {listing.type}
                </Badge>
                {isHostMode && (
                  <div className="flex items-center gap-2">
                    <DeleteListingButton
                      listingId={listing._id}
                      listingTitle={listing.title}
                      variant="button"
                    />
                    <EditListingButton
                      listingId={listing._id}
                      variant="manage"
                      defaultValues={{
                        title: listing.title,
                        description: listing.description,
                        price: listing.price,
                        location: {
                          address: listing.location?.address ?? "",
                          city: listing.location?.city ?? "",
                          country: listing.location?.country ?? "",
                        },
                      }}
                    />
                  </div>
                )}
              </div>
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

              <Separator />

              <p className="text-muted-foreground leading-relaxed">
                {listing.description}
              </p>
            </div>

            <Section title="Photos">
              <ListingPhotos
                photos={(listing.photos ?? []).filter(
                  (p): p is string => !!p,
                )}
                title={listing.title}
                listingId={listing._id}
                isHostMode={isHostMode}
              />
            </Section>

            {isHostMode ? (
              <Section
                title="Other reviews"
                subtitle="What guests are saying about this listing"
                card
                cardSize="sm"
              >
                <ListingReviews
                  reviewsPromise={reviewsPromise}
                  isHostMode={isHostMode}
                />
              </Section>
            ) : (
              <>
                <Section
                  title="Leave a review"
                  subtitle="Share your experience to help other guests."
                >
                  <ReviewForm listingId={listing._id} />
                </Section>

                <Section
                  title="Other reviews"
                  subtitle="Check out other customer comments"
                  card
                  cardSize="sm"
                >
                  <ListingReviews
                    reviewsPromise={reviewsPromise}
                    isHostMode={isHostMode}
                  />
                </Section>
              </>
            )}
          </div>

          {isHostMode ? (
            <div className="flex flex-col gap-4">
              {bookingsPromise && (
                <Section
                  title="Upcoming Bookings"
                  subtitle="Reservations guests have made for this listing"
                >
                  <ListingBookings bookingsPromise={bookingsPromise} />
                </Section>
              )}

              <Section
                title="Metrics"
                subtitle="Performance insights for this listing"
                card
              >
                <p className="text-sm text-muted-foreground">
                  Listing metrics are coming soon.
                </p>
              </Section>
            </div>
          ) : (
            <Section
              title="Book this listing"
              subtitle={<PriceLabel price={listing.price} />}
              card
            >
              <BookingForm
                listingId={listing._id}
                pricePerNight={listing.price}
              />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
