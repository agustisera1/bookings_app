"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDate, calcNights, datePickerTriggerClass } from "@/lib/dates";
import { createBooking } from "@/lib/services/bookings";

const bookingSchema = z
  .object({
    checkIn: z.date({ error: "Select a check-in date" }),
    checkOut: z.date({ error: "Select a check-out date" }),
    guests: z
      .number({ error: "Enter the number of guests" })
      .int()
      .min(1, "At least 1 guest")
      .max(16, "Max 16 guests"),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;

export function BookingForm({
  listingId,
  pricePerNight,
}: {
  listingId: string;
  pricePerNight: number;
}) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { guests: 1 },
  });

  const checkIn = useWatch({ control, name: "checkIn" });
  const checkOut = useWatch({ control, name: "checkOut" });
  const nights = calcNights(checkIn, checkOut);
  const total = nights * pricePerNight;

  async function onSubmit(data: BookingFormValues) {
    const result = await createBooking({
      listingId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      totalPrice: total,
    });
    if (!result.ok) {
      toast.error(result.error ?? "Could not complete your booking");
      throw new Error(result.error);
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-3xl">🎉</span>
        <p className="font-medium">Booking requested!</p>
        <p className="text-sm text-muted-foreground">
          You will receive a confirmation shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label>Check-in</Label>
          <Controller
            control={control}
            name="checkIn"
            render={({ field }) => (
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger
                  className={datePickerTriggerClass(!!field.value)}
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="size-4 shrink-0" />
                    {field.value ? formatDate(field.value) : "Add date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                  side="bottom"
                >
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      if (checkOut && date && checkOut <= date)
                        setValue("checkOut", undefined as unknown as Date, {
                          shouldValidate: true,
                        });
                      setCheckInOpen(false);
                      if (date) setCheckOutOpen(true);
                    }}
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.checkIn && (
            <p className="text-xs text-destructive">{errors.checkIn.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Check-out</Label>
          <Controller
            control={control}
            name="checkOut"
            render={({ field }) => (
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger
                  className={datePickerTriggerClass(!!field.value)}
                >
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="size-4 shrink-0" />
                    {field.value ? formatDate(field.value) : "Add date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                  side="bottom"
                >
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setCheckOutOpen(false);
                    }}
                    disabled={{ before: checkIn ?? new Date() }}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.checkOut && (
            <p className="text-xs text-destructive">
              {errors.checkOut.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="guests">Guests</Label>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="guests"
            type="number"
            min={1}
            max={16}
            className="pl-9 h-10"
            {...register("guests", { valueAsNumber: true })}
          />
        </div>
        {errors.guests && (
          <p className="text-xs text-destructive">{errors.guests.message}</p>
        )}
      </div>

      {nights > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>
                ${pricePerNight} × {nights} night{nights !== 1 ? "s" : ""}
              </span>
              <span>${total}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>
        </>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
        variant="primary"
      >
        {isSubmitting ? "Requesting…" : "Book now"}
      </Button>
    </form>
  );
}
