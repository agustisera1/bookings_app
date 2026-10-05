import { z } from "zod";

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
    listingId: z.string().regex(/^[a-f\d]{24}$/i, "Listing not found"),
    totalPrice: z.number().positive(),
  })
  .refine(checkOutAfterCheckIn.check, checkOutAfterCheckIn.message);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const bookingIdSchema = z.uuid("Booking not found");

// Optional note the host or guest attaches to a status change.
export const statusReasonSchema = z.string().trim().max(256, "Keep it under 256 characters").optional();
