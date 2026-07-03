"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { XIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/field";
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

          <FormField
            className="py-2"
            htmlFor={`host-message-${action}-${bookingId}`}
            label={
              isAccept ? "Message for the guest (optional)" : "Reason (optional)"
            }
          >
            <Textarea
              id={`host-message-${action}-${bookingId}`}
              rows={3}
              placeholder={
                isAccept ? "Any note for the guest…" : "Let the guest know why…"
              }
              className="resize-none"
              {...register("hostMessage")}
            />
          </FormField>

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
