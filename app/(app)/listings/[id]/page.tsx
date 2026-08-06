import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/common/section";
import { PriceLabel } from "@/components/common/price-label";
import { BookingForm } from "@/components/bookings/booking-form";
import { ListingPhotos } from "@/components/listings/listing-photos";
import { EditListingButton } from "@/components/listings/edit-listing-button";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { MapPin, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { PageLayout } from "@/components/common/page-layout";
import { query } from "@/lib/apollo/client";
import { GetListingDocument } from "@/lib/apollo/__generated__/operations";
import { getListingReviews } from "@/lib/services/reviews";
import { ListingReviews } from "@/components/reviews/listing-reviews";
import { getCurrentUser } from "@/lib/services/auth";
import {
  getListingAvailability,
  getListingBookings,
} from "@/lib/services/listings";
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

  if (error || listing === null) notFound();

  const currentUser = await getCurrentUser();
  const isHostMode =
    !!currentUser?.is_host && currentUser.id === listing.host_id;

  const reviewsPromise = getListingReviews(id);
  const availabilityPromise = getListingAvailability(id);
  const bookingsPromise = isHostMode ? getListingBookings(id) : undefined;

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
      <div className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <PageLayout
          back={
            <BackLink href={isHostMode ? "/listings/mine" : "/listings"}>
              Back to listings
            </BackLink>
          }
          actions={
            isHostMode && (
              <>
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
              </>
            )
          }
          title={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {listing.title}
              <span className="flex shrink-0 items-center gap-1.5">
                <Star className="size-5 fill-rating text-rating" />
                <span className="text-base font-semibold">
                  {listing.rating_avg}
                </span>
              </span>
              <Badge
                variant="outline"
                className="uppercase tracking-widest text-2xs"
              >
                {listing.type}
              </Badge>
            </span>
          }
          subtitle={
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {listing.location?.city || "Location not specified"},{" "}
              {listing.location?.country || "Country not specified"}
            </span>
          }
          contentClassName="flex flex-col gap-4"
        >
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

          {/* Reviews are written from the booking they belong to
              (`bookings/[id]`), so this page only shows them. */}
          <Section
            title="Reviews"
            subtitle={
              isHostMode
                ? "What guests are saying about this listing"
                : "What guests who stayed here are saying"
            }
            card
            cardSize="sm"
          >
            <ListingReviews
              reviewsPromise={reviewsPromise}
              isHostMode={isHostMode}
            />
          </Section>
        </PageLayout>
      </div>

      <aside className="flex shrink-0 flex-col gap-6 border-t px-6 py-5 md:px-10 md:py-6 lg:min-h-0 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-8">
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
            title="Book this listing"
            subtitle={<PriceLabel price={listing.price} />}
            card
          >
            <BookingForm
              listingId={listing._id}
              pricePerNight={listing.price}
              availabilityPromise={availabilityPromise}
            />
          </Section>
        )}
      </aside>
    </div>
  );
}
