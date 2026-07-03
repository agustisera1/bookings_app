"use client";

import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { deleteBooking } from "@/lib/services/bookings";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  async function handleCancel() {
    const result = await deleteBooking(bookingId);
    if (!result.ok) {
      toast.error(result.error);
      return false; // keep the dialog open to retry
    }
    toast.success("Booking cancelled successfully");
  }

  return (
    <ConfirmDialog
      tooltip="Cancel"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
          <span className="sr-only">Cancel booking</span>
        </Button>
      }
      title="Cancel this booking?"
      description="This action cannot be undone. Your booking will be permanently cancelled."
      confirmLabel="Yes, cancel"
      pendingLabel="Cancelling…"
      cancelLabel="Keep booking"
      onConfirm={handleCancel}
    />
  );
}
