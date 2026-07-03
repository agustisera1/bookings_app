"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { XIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { acceptBooking, rejectBooking } from "@/lib/services/bookings";

const hostMessageSchema = z.object({
  hostMessage: z.string().optional(),
});
type HostMessageValues = z.infer<typeof hostMessageSchema>;

function BookingActionDialog({
  bookingId,
  action,
}: {
  bookingId: string;
  action: "accept" | "reject";
}) {
  const isAccept = action === "accept";
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<HostMessageValues>({
    resolver: zodResolver(hostMessageSchema),
    defaultValues: { hostMessage: "" },
  });

  async function onSubmit(data: HostMessageValues) {
    const result = isAccept
      ? await acceptBooking(bookingId, data.hostMessage)
      : await rejectBooking(bookingId, data.hostMessage);

    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    setOpen(false);
    reset();
    toast.success(isAccept ? "Booking accepted" : "Booking rejected");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            className="rounded-md"
            variant={isAccept ? "primary" : "destructive"}
          />
        }
      >
        {isAccept ? (
          <CheckIcon className="size-4" />
        ) : (
          <XIcon className="size-4" />
        )}
        {isAccept ? "Accept" : "Reject"}
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAccept ? "Accept this booking?" : "Reject this booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAccept
                ? "The guest will be notified that their booking was accepted."
                : "This action cannot be undone. The guest will be notified that their booking request was rejected."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor={`host-message-${action}-${bookingId}`}>
              {isAccept
                ? "Message for the guest (optional)"
                : "Reason (optional)"}
            </Label>
            <textarea
              id={`host-message-${action}-${bookingId}`}
              rows={3}
              placeholder={
                isAccept ? "Any note for the guest…" : "Let the guest know why…"
              }
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              {...register("hostMessage")}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="submit"
              variant={isAccept ? "primary" : "destructive"}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isAccept
                  ? "Accepting…"
                  : "Rejecting…"
                : isAccept
                  ? "Yes, accept"
                  : "Yes, reject"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ManageBookingActions({ bookingId }: { bookingId: string }) {
  return (
    <div className="flex items-center gap-2">
      <BookingActionDialog bookingId={bookingId} action="reject" />
      <BookingActionDialog bookingId={bookingId} action="accept" />
    </div>
  );
}
