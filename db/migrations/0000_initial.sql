CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar(24) NOT NULL,
	"guest_id" uuid NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" varchar(80) DEFAULT 'pending' NOT NULL,
	"status_reason" varchar(256),
	"total_price" numeric(10, 2) NOT NULL,
	"refund_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"guests" smallint NOT NULL,
	"cancelled_by" varchar(10),
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "booking_status_valid" CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
	CONSTRAINT "booking_cancelled_by_valid" CHECK (cancelled_by IS NULL OR cancelled_by IN ('guest', 'host')),
	CONSTRAINT "booking_cancellation_fields" CHECK ((status = 'cancelled' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL)
        OR (status <> 'cancelled' AND cancelled_by IS NULL AND cancelled_at IS NULL))
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" varchar(40) NOT NULL,
	"aggregate_id" varchar(36) NOT NULL,
	"event_type" varchar(60) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"event_id" uuid NOT NULL,
	"consumer" varchar(40) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_events_event_id_consumer_pk" PRIMARY KEY("event_id","consumer")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar(24) NOT NULL,
	"author_name" varchar(60) NOT NULL,
	"rating" smallint NOT NULL,
	"comment" varchar(256) NOT NULL,
	"host_reply" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(80) NOT NULL,
	"password_hash" varchar(256) NOT NULL,
	"name" varchar(80) NOT NULL,
	"is_host" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_email" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "guest_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "processed_events" ADD CONSTRAINT "processed_events_event_id_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_daterange_gist" ON "bookings" USING gist (tstzrange(start_date, end_date, '[]')) WHERE status NOT IN ('cancelled', 'rejected');--> statement-breakpoint
CREATE INDEX "bookings_guest_id_idx" ON "bookings" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "bookings_listing_id_idx" ON "bookings" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox" USING btree ("created_at") WHERE published_at IS NULL;