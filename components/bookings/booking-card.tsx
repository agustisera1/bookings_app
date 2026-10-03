import Link from "next/link";
import { CalendarRange, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoverImage, OverlayBadge } from "@/components/common/cover-image";
import { formatDateRange, calcNights } from "@/lib/dates";
import {
  cn,
  formatPrice,
  bookingStatusVariant,
  listingTypeGradient,
} from "@/lib/utils";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";
import { toCancellableRow, type BookingRow } from "./bookings-model";

export function BookingCard({
  booking,
  muted,
}: {
  booking: BookingRow;
  muted: boolean;
}) {
  const nights = calcNights(booking.start_date, booking.end_date);

  return (
    <li>
      <Card
        className={cn(
          "group relative flex h-full flex-col overflow-hidden p-0 transition-shadow duration-300 hover:shadow-lg",
          muted && "opacity-90",
        )}
      >
        {/* Stretched link: the whole card navigates to the detail page. Sits
            below interactive children (cancel), which lift above it with z-10. */}
        <Link
          href={`/bookings/${booking.id}`}
          className="absolute inset-0 z-0"
          aria-label={`View booking for ${booking.listing?.title ?? "listing"}`}
        />
        <CoverImage
          src={booking.listing?.photos?.[0]}
          alt={booking.listing?.title ?? ""}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          fallbackClassName={listingTypeGradient(booking.listing?.type)}
          zoomOnHover
          className={cn("h-24 p-3", muted && "saturate-50")}
        >
          <OverlayBadge>{booking.listing?.type}</OverlayBadge>
        </CoverImage>

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 min-w-0 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">
            {booking.listing?.title}
          </h3>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="size-3.5 shrink-0" />
              <span>
                {formatDateRange(booking.start_date, booking.end_date)}
                {nights != null &&
                  ` · ${nights} night${nights !== 1 ? "s" : ""}`}
              </span>
            </div>
            {booking.guests != null && (
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 shrink-0" />
                <span>
                  {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tabular-nums">
                {formatPrice(booking.total_price)}
              </span>
              <Badge
                variant={
                  booking.status
                    ? bookingStatusVariant[booking.status]
                    : "outline"
                }
                className="capitalize"
              >
                {booking.status}
              </Badge>
            </div>
            <div className="relative z-10 flex items-center gap-1">
              <CancelBookingButton
                bookingId={booking.id ?? ""}
                actor="guest"
                booking={toCancellableRow(booking)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
