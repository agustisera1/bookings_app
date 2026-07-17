"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ApolloClient } from "@apollo/client";
import { GetUserBookingsQuery } from "@/lib/apollo/__generated__/operations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Users } from "lucide-react";
import { formatDate, calcNights, parseTs } from "@/lib/dates";
import { formatPrice, bookingStatusVariant, listingTypeGradient } from "@/lib/utils";
import { EmptyState } from "@/components/common/empty-state";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";

type BookingRow = NonNullable<
  NonNullable<GetUserBookingsQuery["guestBookings"]>[number]
>;

function endTime(b: BookingRow) {
  return parseTs(b.end_date)?.getTime() ?? 0;
}
function startTime(b: BookingRow) {
  return parseTs(b.start_date)?.getTime() ?? 0;
}

export function UserBookings({
  userBookingsPromise,
}: {
  userBookingsPromise: Promise<ApolloClient.QueryResult<GetUserBookingsQuery>>;
}) {
  const { data } = use(userBookingsPromise);
  const bookings = (data?.guestBookings?.filter(Boolean) ?? []) as BookingRow[];
  // Captured once at mount: a stable "now" to split upcoming vs. past.
  const [now] = useState(() => Date.now());

  if (bookings.length === 0) {
    return (
      <EmptyState
        className="py-16"
        title="No trips booked yet"
        description="When you book a stay, experience or rental, it will show up here."
      />
    );
  }

  // Upcoming (soonest first) on top, past trips (most recent first) below.
  const upcoming = bookings
    .filter((b) => endTime(b) >= now)
    .sort((a, b) => startTime(a) - startTime(b));
  const past = bookings
    .filter((b) => endTime(b) < now)
    .sort((a, b) => endTime(b) - endTime(a));

  return (
    <div className="flex flex-col gap-10">
      {upcoming.length > 0 && (
        <BookingSection title="Upcoming" bookings={upcoming} />
      )}
      {past.length > 0 && (
        <BookingSection title="Past" bookings={past} muted />
      )}
    </div>
  );
}

function BookingSection({
  title,
  bookings,
  muted = false,
}: {
  title: string;
  bookings: BookingRow[];
  muted?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground/70">
          {bookings.length}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} muted={muted} />
        ))}
      </ul>
    </section>
  );
}

function BookingCard({
  booking,
  muted,
}: {
  booking: BookingRow;
  muted: boolean;
}) {
  const nights = calcNights(booking.start_date, booking.end_date);
  const gradient = listingTypeGradient(booking.type);
  const cover = booking.photos?.[0];

  return (
    <li>
      <Card
        className={`group relative flex h-full flex-col overflow-hidden p-0 transition-shadow duration-300 hover:shadow-xl ${
          muted ? "opacity-90" : ""
        }`}
      >
        {/* Stretched link: the whole card navigates to the detail page. Sits
            below interactive children (cancel), which lift above it with z-10. */}
        <Link
          href={`/bookings/${booking.id}`}
          className="absolute inset-0 z-0"
          aria-label={`View booking for ${booking.title ?? "listing"}`}
        />
        <div
          className={`relative flex h-24 items-end overflow-hidden p-3 ${
            muted ? "saturate-[.6]" : ""
          }`}
        >
          {cover ? (
            <Image
              src={cover}
              alt={booking.title ?? ""}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
            />
          )}
          <Badge className="relative bg-black/20 text-white/90 uppercase tracking-widest text-[10px] backdrop-blur-sm hover:bg-black/30">
            {booking.type}
          </Badge>
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 min-w-0 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">
            {booking.title}
          </h3>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="size-3.5 shrink-0" />
              <span>
                {formatDate(booking.start_date)} — {formatDate(booking.end_date)}
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
              <span className="text-base font-semibold">
                {formatPrice(booking.total_price)}
              </span>
              <Badge
                variant={
                  booking.status ? bookingStatusVariant[booking.status] : "outline"
                }
                className="capitalize"
              >
                {booking.status}
              </Badge>
            </div>
            {/* Lifted above the stretched link so the dialog trigger stays clickable. */}
            <div className="relative z-10 flex items-center gap-1">
              <CancelBookingButton
                bookingId={booking.id ?? ""}
                actor="guest"
                booking={{
                  status: booking.status ?? "pending",
                  startDate: booking.start_date ?? "",
                  totalPrice: booking.total_price ?? 0,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
