ALTER TABLE "bookings" ADD CONSTRAINT "booking_dates_ordered" CHECK (end_date > start_date);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "booking_guests_positive" CHECK (guests >= 1);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "booking_total_price_positive" CHECK (total_price > 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "booking_refund_range" CHECK (refund_amount BETWEEN 0 AND total_price);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK (email = lower(email));