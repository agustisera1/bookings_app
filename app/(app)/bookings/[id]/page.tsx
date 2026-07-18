import Link from "next/link";
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
  // page with the listing this reservation is for.
  //
  // TECH DEBT — this fetches every booking the user has just to read one row's
  // title and dates, and now that the thread moved to /messages that's most of
  // what the page does. It also only looks at `guestBookings`, so a host
  // opening their own booking gets the fallback title. Wants a `booking(id:)`
  // query in the schema.
  const { data } = await query({ query: GetUserBookingsDocument });
  const booking = data?.guestBookings?.find((b) => b?.id === id) ?? null;

  const nights = booking ? calcNights(booking.start_date, booking.end_date) : 0;
  const title = booking?.title ?? "Booking details";
  const subtitle = booking
    ? `${formatDate(booking.start_date)} – ${formatDate(booking.end_date)} · ${nights} night${nights === 1 ? "" : "s"}`
    : "Review the details of your reservation.";

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
