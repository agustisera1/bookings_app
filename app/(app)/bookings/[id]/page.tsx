import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // page with the listing this reservation is for. Its cost and the host-side
  // gap are in `docs/tech_debt/CHAT_FEATURE_NEXT_STEPS.md`.
  const { data } = await query({ query: GetUserBookingsDocument });
  const booking = data?.guestBookings?.find((b) => b?.id === id) ?? null;
  // A booking that isn't the viewer's own — or doesn't exist — collapses to the
  // same 404, so this route never confirms another guest's reservation exists.
  if (!booking) notFound();

  const nights = calcNights(booking.start_date, booking.end_date);
  const title = booking.title ?? "Booking details";
  const subtitle = `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)} · ${nights} night${nights === 1 ? "" : "s"}`;

  // The thread itself lives in /messages now; this just points at it.
  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/messages/${id}`} />}
        >
          <MessageSquare />
          Open conversation
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Messages about this reservation live in your inbox.
      </p>
    </PageLayout>
  );
}
