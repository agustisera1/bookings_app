"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelBooking } from "@/lib/services/bookings";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    setIsPending(true);
    const result = await cancelBooking(bookingId);
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("Booking cancelled successfully");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        }
      >
        <Trash2Icon className="size-4" />
        <span className="sr-only">Cancel booking</span>
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Your booking will be permanently
            cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            Keep booking
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleCancel}
          >
            {isPending ? "Cancelling…" : "Yes, cancel"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
