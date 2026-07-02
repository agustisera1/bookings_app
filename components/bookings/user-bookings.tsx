"use client";

import { use } from "react";
import Link from "next/link";
import { ApolloClient } from "@apollo/client";
import { GetUserBookingsQuery } from "@/lib/apollo/__generated__/operations";
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "lucide-react";
import { formatDate, calcNights } from "@/lib/dates";
import { formatPrice, bookingStatusVariant } from "@/lib/utils";
import { CancelBookingButton } from "@/components/bookings/cancel-booking-button";

export function UserBookings({
  userBookingsPromise,
}: {
  userBookingsPromise: Promise<ApolloClient.QueryResult<GetUserBookingsQuery>>;
}) {
  const { data } = use(userBookingsPromise);
  const bookings = data?.guestBookings?.filter(Boolean) ?? [];

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-base font-medium">No trips booked yet</p>
        <p className="text-sm text-muted-foreground">
          When you book a stay, experience or rental, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <ItemGroup>
      {bookings.map((booking) => {
        const nights = calcNights(booking!.start_date, booking!.end_date);
        return (
          <Item
            key={booking!.id}
            variant="outline"
          >
            <ItemHeader>
              <ItemTitle>{booking!.title}</ItemTitle>
            </ItemHeader>
            <ItemContent>
              <ItemDescription>
                {formatDate(booking!.start_date)} —{" "}
                {formatDate(booking!.end_date)}
                {nights != null &&
                  ` · ${nights} night${nights !== 1 ? "s" : ""}`}
                {booking!.guests != null &&
                  ` · ${booking!.guests} guest${booking!.guests !== 1 ? "s" : ""}`}
              </ItemDescription>
            </ItemContent>
            <ItemFooter>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatPrice(booking!.total_price)}
                </span>
                <Badge
                  variant={
                    bookingStatusVariant[booking!.status ?? ""] ?? "outline"
                  }
                  className="capitalize"
                >
                  {booking!.status}
                </Badge>
              </div>
              <ItemActions>
                <CancelBookingButton bookingId={booking!.id ?? ""} />
                <Link href={`/bookings/${booking!.id}`}>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              </ItemActions>
            </ItemFooter>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
