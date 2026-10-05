import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/common/section";
import { PriceLabel } from "@/components/common/price-label";
import { BookingForm } from "@/components/bookings/booking-form";
import { ListingPhotos } from "@/components/listings/listing-photos";
import { EditListingButton } from "@/components/listings/edit-listing-button";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { ChartNoAxesColumn, MapPin, Star } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { PageLayout } from "@/components/common/page-layout";
import { query } from "@/lib/apollo/client";
import {
  GetListingBookingsDocument,
  GetListingDocument,
} from "@/lib/apollo/__generated__/operations";
import { ListingReviews } from "@/components/reviews/listing-reviews";
import { getCurrentUser } from "@/lib/auth/session";
import { ListingBookings } from "@/components/bookings/listing-bookings";

export const metadata: Metadata = { title: "Listing" };

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // "all": a failed nested field (reviews) still returns the listing.
  const { data } = await query({
    query: GetListingDocument,
    variables: { listing_id: id },
    errorPolicy: "all",
  });

  const listing = data?.listing;
  if (!listing) notFound();

  const currentUser = await getCurrentUser();
  const isHostMode =
    !!currentUser?.is_host && currentUser.id === listing.host_id;

  // A second query: whether you're the host is only known once the listing is in.
  const bookingsPromise = isHostMode
    ? query({
        query: GetListingBookingsDocument,
        variables: { listing_id: id },
        errorPolicy: "all",
      }).then(({ data }) => data?.listing?.bookings ?? null)
    : undefined;

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
                <span className="text-base font-semibold tabular-nums">
                  {listing.rating_avg ?? "New"}
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
          contentClassName="flex flex-col gap-8"
        >
          <ListingPhotos
            photos={(listing.photos ?? []).filter((p): p is string => !!p)}
            title={listing.title}
            listingId={listing._id}
            isHostMode={isHostMode}
          />

          <Section title="About this place">
            <p className="max-w-prose leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
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
              reviews={listing.reviews ?? null}
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
                title="Bookings"
                subtitle="Reservations guests made for this listing"
              >
                <ListingBookings bookingsPromise={bookingsPromise} />
              </Section>
            )}

            <Section
              title="Metrics"
              subtitle="Performance insights for this listing"
              card
            >
              <EmptyState
                className="py-10"
                icon={<ChartNoAxesColumn />}
                title="Coming soon"
                description="Views, bookings and rating trends will show up here."
              />
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
              bookedRanges={listing.availability ?? null}
            />
          </Section>
        )}
      </aside>
    </div>
  );
}
