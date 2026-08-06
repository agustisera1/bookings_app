import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { bookingStatusVariant, listingTypeGradient } from "@/lib/utils";
import type { BookingDetailRow } from "./bookings-model";

export function BookingDetailHero({ booking }: { booking: BookingDetailRow }) {
  const cover = booking.listing?.photos?.[0];
  const gradient = listingTypeGradient(booking.listing?.type);

  return (
    <div className="relative flex h-44 items-end overflow-hidden rounded-xl ring-1 ring-foreground/10 md:h-60">
      {cover ? (
        <Image
          src={cover}
          alt={booking.listing?.title ?? ""}
          fill
          sizes="(min-width: 1024px) 64rem, 100vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-overlay/50 to-transparent" />

      <div className="relative flex w-full items-center justify-between gap-3 p-4">
        <Badge className="bg-overlay/25 text-overlay-foreground/90 uppercase tracking-widest text-2xs backdrop-blur-sm">
          {booking.listing?.type}
        </Badge>
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
    </div>
  );
}
