ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'booking-payment-link';--> statement-breakpoint
DROP INDEX "message_log_booking_kind_key";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_link_token_hash" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_link_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "link_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_payment_link_token_key" ON "bookings" USING btree ("payment_link_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_payment_link_key" ON "message_log" USING btree ("kind","recipient","booking_id","link_sent_at") WHERE "booking_id" is not null and "link_sent_at" is not null and "status" <> 'failed';--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_booking_kind_key" ON "message_log" USING btree ("kind","recipient","booking_id") WHERE "booking_id" is not null and "subject_date" is null and "link_sent_at" is null and "status" <> 'failed';