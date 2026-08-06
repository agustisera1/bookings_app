import Link from "next/link";
import { notFound } from "next/navigation";
import { House, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/common/back-link";
import { PageLayout } from "@/components/common/page-layout";
import { BookingDetail } from "@/components/bookings/booking-detail";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { isReviewable } from "@/components/bookings/booking-detail-model";
import { toCancellableRow } from "@/components/bookings/bookings-model";
import { ReviewForm } from "@/components/reviews/review-form";
import { GetBookingDocument } from "@/lib/apollo/__generated__/operations";
import { query } from "@/lib/apollo/client";
import { calcNights, formatDate } from "@/lib/dates";
import { getCurrentUser } from "@/lib/services/auth";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return "Unauthenticated";

  // `all` so a booking that isn't the viewer's own comes back as a NOT_FOUND
  // error to turn into a 404, instead of throwing into the error boundary.
  const { data, error } = await query({
    query: GetBookingDocument,
    variables: { id },
    errorPolicy: "all",
  });

  const booking = data?.booking ?? null;
  // Hosts can already resolve the booking; what they don't have yet is a view
  // written for them. See docs/tech_debt/BOOKINGS_NEXT_STEPS.md § 2.
  if (error || !booking || booking.party === "host") notFound();

  const now = new Date();
  const nights = calcNights(booking.start_date, booking.end_date);
  const listingId = booking.listing?._id;
  const title = booking.listing?.title ?? "Booking details";
  const subtitle = `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)} · ${nights} night${nights === 1 ? "" : "s"}`;

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-6xl"
      back={<BackLink href="/bookings">Back to bookings</BackLink>}
      actions={
        <>
          {listingId && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/listings/${listingId}`} />}
            >
              <House />
              View listing
            </Button>
          )}
          <Button
            variant="primary"
            nativeButton={false}
            render={<Link href={`/messages/${id}`} />}
          >
            <MessageSquare />
            Message host
          </Button>
          <CancelBookingButton
            bookingId={id}
            actor="guest"
            booking={toCancellableRow(booking)}
            variant="button"
          />
        </>
      }
    >
      <BookingDetail
        booking={booking}
        now={now}
        review={isReviewable(booking, now) && <ReviewForm bookingId={id} />}
      />
    </PageLayout>
  );
}
