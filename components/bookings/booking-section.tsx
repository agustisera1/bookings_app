import { GroupHeader } from "@/components/common/group-header";
import { BookingCard } from "./booking-card";
import type { BookingRow } from "./bookings-model";

export function BookingSection({
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
      <GroupHeader title={title} count={bookings.length} />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} muted={muted} />
        ))}
      </ul>
    </section>
  );
}
