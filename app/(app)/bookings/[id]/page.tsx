import Chat from "@/components/chat/chat";
import { PageLayout } from "@/components/common/page-layout";
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

  // Reuse the guest bookings query (no single-booking query yet) to title the
  // page with the listing this reservation is for.
  const { data } = await query({ query: GetUserBookingsDocument });
  const booking = data?.guestBookings?.find((b) => b?.id === id) ?? null;

  const nights = booking ? calcNights(booking.start_date, booking.end_date) : 0;
  const title = booking?.title ?? "Booking details";
  const subtitle = booking
    ? `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)} · ${nights} night${nights === 1 ? "" : "s"}`
    : "Review the details of your reservation.";

  return (
    <PageLayout title={title} subtitle={subtitle}>
      <Chat bookingId={id} currentUserId={user.id} />
    </PageLayout>
  );
}
