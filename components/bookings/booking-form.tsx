"use client";

import { use, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/field";
import { DatePicker } from "@/components/common/date-picker";
import { EmptyState } from "@/components/common/empty-state";
import { calcNights } from "@/lib/dates";
import { formatPrice } from "@/lib/utils";
import { createBooking } from "@/lib/services/bookings";
import { ServiceResult } from "@/lib/types";
import { Matcher } from "react-day-picker";

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
  availabilityPromise,
}: {
  listingId: string;
  pricePerNight: number;
  availabilityPromise: Promise<ServiceResult<Matcher[]>>;
}) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [today] = useState(() => new Date());
  const availability = use(availabilityPromise);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { guests: 1 },
  });

  const checkIn = useWatch({ control, name: "checkIn" });
  const checkOut = useWatch({ control, name: "checkOut" });
  const guests = useWatch({ control, name: "guests" });
  const nights = calcNights(checkIn, checkOut);
  const total = nights * pricePerNight * (guests || 0);

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
  }

  if (isSubmitSuccessful) {
    return (
      <EmptyState
        className="py-8"
        icon={<CalendarCheck />}
        title="Booking requested"
        description="You will receive a confirmation shortly."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Check-in" error={errors.checkIn?.message}>
          <Controller
            control={control}
            name="checkIn"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                open={checkInOpen}
                onOpenChange={setCheckInOpen}
                onSelect={(date) => {
                  field.onChange(date);
                  if (checkOut && date && checkOut <= date)
                    setValue("checkOut", undefined as unknown as Date, {
                      shouldValidate: true,
                    });
                  setCheckInOpen(false);
                  if (date) setCheckOutOpen(true);
                }}
                // Inclusive DateRange matchers: each booking blocks its start and end date.
                disabled={[
                  { before: today },
                  ...(availability.ok ? availability.data : []),
                ]}
              />
            )}
          />
        </FormField>

        <FormField label="Check-out" error={errors.checkOut?.message}>
          <Controller
            control={control}
            name="checkOut"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                open={checkOutOpen}
                onOpenChange={setCheckOutOpen}
                onSelect={(date) => {
                  field.onChange(date);
                  setCheckOutOpen(false);
                }}
                disabled={{ before: checkIn ?? today }}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label="Guests" htmlFor="guests" error={errors.guests?.message}>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="guests"
            type="number"
            min={1}
            max={16}
            className="pl-9"
            {...register("guests", { valueAsNumber: true })}
          />
        </div>
      </FormField>

      <div className="flex flex-col gap-1 text-sm tabular-nums">
        <div className="flex justify-between text-muted-foreground">
          <span>Price per night</span>
          <span>{formatPrice(pricePerNight)}</span>
        </div>

        {nights > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>
              {formatPrice(pricePerNight)} × {nights} night
              {nights !== 1 ? "s" : ""}
            </span>
            <span>{formatPrice(nights * pricePerNight)}</span>
          </div>
        )}

        {nights > 0 && guests > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>
              × {guests} guest{guests !== 1 ? "s" : ""}
            </span>
            <span>{formatPrice(total)}</span>
          </div>
        )}

        {nights > 0 && (
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Requesting…" : "Book now"}
      </Button>
    </form>
  );
}
