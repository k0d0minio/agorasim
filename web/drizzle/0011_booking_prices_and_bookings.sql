CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'expired', 'refunded');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_request_id" uuid,
	"date" date NOT NULL,
	"slot" "availability_slot" DEFAULT 'full_day' NOT NULL,
	"experience_slug" text NOT NULL,
	"add_ons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"party_size" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"price_breakdown" jsonb NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"locale" "locale" DEFAULT 'pt' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"hold_expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_request_id_tour_requests_id_fk" FOREIGN KEY ("tour_request_id") REFERENCES "public"."tour_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_date_slot_idx" ON "bookings" USING btree ("date","slot","status");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_tour_request_idx" ON "bookings" USING btree ("tour_request_id");