import { z } from "zod";
import { listingIdSchema } from "@/lib/listings/validation";

const stayFields = {
  checkIn: z.date({ error: "Select a check-in date" }),
  checkOut: z.date({ error: "Select a check-out date" }),
  guests: z
    .number({ error: "Enter the number of guests" })
    .int()
    .min(1, "At least 1 guest")
    .max(16, "Max 16 guests"),
};

const checkOutAfterCheckIn = {
  check: (stay: { checkIn: Date; checkOut: Date }) => stay.checkOut > stay.checkIn,
  message: { message: "Check-out must be after check-in", path: ["checkOut"] },
};

export const staySchema = z
  .object(stayFields)
  .refine(checkOutAfterCheckIn.check, checkOutAfterCheckIn.message);

export const createBookingSchema = z
  .object({
    ...stayFields,
    listingId: listingIdSchema,
    totalPrice: z.number().positive(),
  })
  .refine(checkOutAfterCheckIn.check, checkOutAfterCheckIn.message);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingIdSchema = z.uuid("Booking not found");

// Optional note the host or guest attaches to a status change.
const statusReasonSchema = z.string().trim().max(256, "Keep it under 256 characters").optional();

export const cancelBookingSchema = z.object({
  bookingId: bookingIdSchema,
  reason: statusReasonSchema,
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const manageBookingSchema = z.object({
  bookingId: bookingIdSchema,
  hostMessage: statusReasonSchema,
});

export type ManageBookingInput = z.infer<typeof manageBookingSchema>;
