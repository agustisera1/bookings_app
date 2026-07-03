import { Badge } from "@/components/ui/badge";
import { use } from "react";
import { ServiceResult } from "@/lib/types";
import { Booking } from "@/lib/services/bookings";
import { formatDate, calcNights } from "@/lib/dates";
import { formatPrice, bookingStatusVariant } from "@/lib/utils";
import { ManageBookingActions } from "./manage-booking-actions";

function BookingCard({ booking }: { booking: Booking }) {
  const nights = calcNights(booking.start_date, booking.end_date);

  return (
    <div className="flex flex-col gap-3 bg-card rounded-lg p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
            <Badge
              variant={bookingStatusVariant[booking.status] ?? "outline"}
              className="capitalize shrink-0"
            >
              {booking.status}
            </Badge>
          </span>
          <span className="text-xs text-muted-foreground">
            {nights} night{nights !== 1 ? "s" : ""} · {booking.guests} guest
            {booking.guests !== 1 ? "s" : ""}
          </span>
        </div>
        {booking.status === "pending" && (
          <ManageBookingActions bookingId={booking.id} />
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {formatPrice(Number(booking.total_price))}
      </p>
    </div>
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
      <p className="text-sm text-muted-foreground">
        No bookings yet for this listing.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {bookings.map((booking) => (
        <div key={booking.id}>
          <BookingCard booking={booking} />
        </div>
      ))}
    </div>
  );
}
