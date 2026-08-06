import { FREE_CANCELLATION_WINDOW_HOURS } from "@/lib/bookings/policy";
import { formatDate, formatTime } from "@/lib/dates";
import { formatPrice } from "@/lib/utils";
import {
  cancellationRecord,
  guestCancellation,
  refundDeadline,
} from "./booking-detail-model";
import type { BookingDetailRow } from "./bookings-model";

function Amount({ value }: { value: number }) {
  return (
    <strong className="font-medium text-foreground">
      {formatPrice(value)}
    </strong>
  );
}

export function BookingCancellationPolicy({
  booking,
  now,
}: {
  booking: BookingDetailRow;
  now: Date;
}) {
  // A booking that was already cancelled has a settlement, not a policy.
  const settled = cancellationRecord(booking);
  if (settled)
    return (
      <p className="text-sm text-muted-foreground">
        {settled.actor === "guest"
          ? "You cancelled this booking"
          : "The host cancelled this booking"}
        {settled.at && ` on ${formatDate(settled.at)}`}.{" "}
        {settled.refundAmount > 0 ? (
          <>
            <Amount value={settled.refundAmount} /> will be refunded.
          </>
        ) : (
          "No refund applied, per the cancellation policy."
        )}
      </p>
    );

  const check = guestCancellation(booking, now);

  if (!check.allowed)
    return <p className="text-sm text-muted-foreground">{check.reason}</p>;

  // A pending request commits nothing, so the forfeit window hasn't started
  // running on it — quoting a deadline here would be wrong.
  if (booking.status === "pending")
    return (
      <p className="text-sm text-muted-foreground">
        The host hasn&apos;t confirmed yet, so cancelling this request refunds{" "}
        <Amount value={check.refundAmount} /> in full. The{" "}
        {FREE_CANCELLATION_WINDOW_HOURS}-hour window only starts counting once
        the host accepts.
      </p>
    );

  if (check.refundAmount === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Check-in is less than {FREE_CANCELLATION_WINDOW_HOURS} hours away, so
        cancelling now is no longer refundable.
      </p>
    );

  const deadline = refundDeadline(booking);
  return (
    <p className="text-sm text-muted-foreground">
      Free cancellation until{" "}
      <strong className="font-medium text-foreground">
        {formatDate(deadline)}, {formatTime(deadline)}
      </strong>
      . Cancelling before then refunds <Amount value={check.refundAmount} /> in
      full.
    </p>
  );
}
