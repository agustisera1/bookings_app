import { use } from "react";
import { CalendarRange, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceResult } from "@/lib/types";
import { Booking } from "@/lib/services/bookings";
import { formatDate, calcNights, parseTs } from "@/lib/dates";
import { formatPrice, bookingStatusVariant } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { toCancellableBooking } from "@/lib/bookings/policy";
import { ManageBookingActions } from "./manage-booking-actions";
import { CancelBookingButton } from "./cancel-booking-button";

function BookingCard({ booking }: { booking: Booking }) {
  const nights = calcNights(booking.start_date, booking.end_date);
  const isPending = booking.status === "pending";

  return (
    <li>
      <Card className="p-0 transition-shadow duration-300 hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
              <span>
                {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
              </span>
            </div>
            <Badge
              variant={bookingStatusVariant[booking.status]}
              className="shrink-0 capitalize"
            >
              {booking.status}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            <span>
              {nights} night{nights !== 1 ? "s" : ""} · {booking.guests} guest
              {booking.guests !== 1 ? "s" : ""}
            </span>
          </div>

          {booking.status_reason && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              “{booking.status_reason}”
            </p>
          )}

          <div className="mt-1 flex items-center justify-between gap-2 border-t pt-3">
            <span className="text-base font-semibold">
              {formatPrice(Number(booking.total_price))}
            </span>
            {isPending ? (
              <ManageBookingActions bookingId={booking.id} />
            ) : (
              <CancelBookingButton
                bookingId={booking.id}
                actor="host"
                booking={toCancellableBooking(booking)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

export function ListingBookings({
  bookingsPromise,
}: {
  bookingsPromise: Promise<ServiceResult<Booking[]>>;
}) {
  const bookingsResponse = use(bookingsPromise);

  if (!bookingsResponse.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load the bookings, please try reloading the page.
      </p>
    );
  }

  const bookings = bookingsResponse.data;

  if (bookings.length === 0) {
    return (
      <EmptyState
        className="py-10"
        icon={<CalendarRange />}
        title="No bookings yet"
        description="Reservations for this listing will appear here."
      />
    );
  }

  // Pending first (they need the host's action), then soonest start date.
  const sorted = [...bookings].sort((a, b) => {
    const aPending = a.status === "pending" ? 0 : 1;
    const bPending = b.status === "pending" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return (
      (parseTs(a.start_date)?.getTime() ?? 0) -
      (parseTs(b.start_date)?.getTime() ?? 0)
    );
  });

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </ul>
  );
}
