import { BookingCard } from "./booking-card";
import type { BookingRow } from "./user-bookings-model";

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
