import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/common/section";
import { PriceLabel } from "@/components/common/price-label";
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
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href={isHostMode ? "/listings/mine" : "/listings"}
          className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to listings
        </Link>

        <header className="flex flex-col gap-2 border-b pb-8">
          <div className="flex items-start justify-start gap-4">
            <Badge
              variant="outline"
              className="w-fit uppercase tracking-widest text-[10px]"
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
          <div className="flex items-center justify-start gap-2">
            <h1 className="font-heading text-3xl font-semibold leading-tight text-balance md:text-4xl">
              {listing.title}
            </h1>
            <div className="flex shrink-0 items-center gap-1.5">
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <span className="text-base font-semibold">
                {listing.rating_avg}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>
              {listing.location?.city || "Location not specified"},{" "}
              {listing.location?.country || "Country not specified"}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3 lg:gap-0">
          <div className="flex flex-col gap-4 lg:col-span-2 lg:border-r lg:pr-10 pt-8">
            <p className="leading-relaxed text-muted-foreground">
              {listing.description}
            </p>

            <Section title="Photos">
              <ListingPhotos
                photos={(listing.photos ?? []).filter((p): p is string => !!p)}
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

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:pl-10">
            {isHostMode ? (
              <>
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
              </>
            ) : (
              <Section
                className="pt-8"
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
          </aside>
        </div>
      </div>
    </div>
  );
}
