import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/common/back-link";
import { PageLayout } from "@/components/common/page-layout";
import { BookingDetail } from "@/components/bookings/booking-detail";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { toCancellableRow } from "@/components/bookings/bookings-model";
import { GetUserBookingsDocument } from "@/lib/apollo/__generated__/operations";
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

  // No single-booking query yet — see docs/tech_debt/PERFORMANCE.md, point 6.
  const { data } = await query({ query: GetUserBookingsDocument });
  const booking = data?.guestBookings?.find((b) => b?.id === id) ?? null;
  // A booking that isn't the viewer's own — or doesn't exist — collapses to the
  // same 404, so this route never confirms another guest's reservation exists.
  if (!booking) notFound();

  const nights = calcNights(booking.start_date, booking.end_date);
  const title = booking.title ?? "Booking details";
  const subtitle = `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)} · ${nights} night${nights === 1 ? "" : "s"}`;

  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-6xl"
      back={<BackLink href="/bookings">Back to bookings</BackLink>}
      actions={
        <>
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
      <BookingDetail booking={booking} now={new Date()} />
    </PageLayout>
  );
}
