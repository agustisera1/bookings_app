"use client";

import { use, useState } from "react";
import { ApolloClient } from "@apollo/client";
import { GetUserBookingsQuery } from "@/lib/apollo/__generated__/operations";
import { EmptyState } from "@/components/common/empty-state";
import { BookingSection } from "./booking-section";
import { partitionBookings, type BookingRow } from "./user-bookings-model";

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

  const { upcoming, past } = partitionBookings(bookings, now);

  return (
    <div className="flex flex-col gap-10">
      {upcoming.length > 0 && (
        <BookingSection title="Upcoming" bookings={upcoming} />
      )}
      {past.length > 0 && <BookingSection title="Past" bookings={past} muted />}
    </div>
  );
}
