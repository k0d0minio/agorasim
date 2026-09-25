DROP INDEX "message_log_booking_date_kind_key";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "move_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "move_seq" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_booking_date_kind_key" ON "message_log" USING btree ("kind","recipient","booking_id","subject_date","move_seq") WHERE "booking_id" is not null and "subject_date" is not null and "status" <> 'failed';