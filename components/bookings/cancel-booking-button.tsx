"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { cancelBooking } from "@/lib/services/bookings";
import { formatPrice } from "@/lib/utils";
import {
  canCancel,
  FREE_CANCELLATION_WINDOW_HOURS,
  type CancellableBooking,
} from "@/lib/bookings/policy";
import type { CancelActor } from "@/lib/types/booking";

// Same predicate the service enforces, so the button can't offer a cancellation
// the server will refuse.
export function CancelBookingButton({
  bookingId,
  booking,
  actor,
}: {
  bookingId: string;
  booking: CancellableBooking;
  actor: CancelActor;
}) {
  // Captured once at mount: reading the clock during render is impure.
  const [now] = useState(() => new Date());
  const check = canCancel(booking, actor, now);

  if (!check.allowed) return null;

  async function handleCancel() {
    const result = await cancelBooking(bookingId);
    if (!result.ok) {
      toast.error(result.error);
      return false; // keep the dialog open to retry
    }
    // "will be refunded", not "refunded": the cancellation records what's owed,
    // it doesn't move money — there's no payment gateway behind this yet.
    toast.success(
      result.data.refundAmount > 0
        ? `Booking cancelled — ${formatPrice(result.data.refundAmount)} will be refunded`
        : "Booking cancelled",
    );
  }

  const description =
    actor === "host"
      ? `The guest will be notified and refunded ${formatPrice(check.refundAmount)} in full. This action cannot be undone.`
      : check.refundAmount > 0
        ? `You'll be refunded ${formatPrice(check.refundAmount)} in full. This action cannot be undone.`
        : `Check-in is less than ${FREE_CANCELLATION_WINDOW_HOURS} hours away, so this cancellation is not refundable. This action cannot be undone.`;

  return (
    <ConfirmDialog
      tooltip="Cancel"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <CircleXIcon />
          <span className="sr-only">Cancel booking</span>
        </Button>
      }
      title="Cancel this booking?"
      description={description}
      confirmLabel="Yes, cancel"
      pendingLabel="Cancelling…"
      cancelLabel="Keep booking"
      onConfirm={handleCancel}
    />
  );
}
