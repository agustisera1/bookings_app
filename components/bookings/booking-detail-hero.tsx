import { Badge } from "@/components/ui/badge";
import { CoverImage, OverlayBadge } from "@/components/common/cover-image";
import { bookingStatusVariant, listingTypeGradient } from "@/lib/utils";
import type { BookingDetailRow } from "./bookings-model";

export function BookingDetailHero({ booking }: { booking: BookingDetailRow }) {
  return (
    <CoverImage
      src={booking.listing?.photos?.[0]}
      alt={booking.listing?.title ?? ""}
      sizes="(min-width: 1024px) 64rem, 100vw"
      fallbackClassName={listingTypeGradient(booking.listing?.type)}
      priority
      className="h-44 rounded-xl ring-1 ring-foreground/10 md:h-60"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-overlay/50 to-transparent" />

      <div className="relative flex w-full items-center justify-between gap-3 p-4">
        <OverlayBadge>{booking.listing?.type}</OverlayBadge>
        {/* The status badge carries semantic colors, which need an opaque
            surface of their own to stay legible over an arbitrary photo. */}
        <span className="rounded-4xl bg-background/85 backdrop-blur-sm">
          <Badge
            variant={
              booking.status ? bookingStatusVariant[booking.status] : "outline"
            }
            className="capitalize"
          >
            {booking.status}
          </Badge>
        </span>
      </div>
    </CoverImage>
  );
}
