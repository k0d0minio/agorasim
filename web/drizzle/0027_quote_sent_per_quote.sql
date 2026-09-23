DROP INDEX "message_log_enquiry_kind_key";--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "quote_id" uuid;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "quote_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_quote_kind_key" ON "message_log" USING btree ("kind","recipient","quote_id","quote_sent_at") WHERE "booking_id" is null and "quote_id" is not null and "quote_sent_at" is not null and "status" <> 'failed';--> statement-breakpoint
CREATE INDEX "message_log_quote_idx" ON "message_log" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_enquiry_kind_key" ON "message_log" USING btree ("kind","recipient","tour_request_id") WHERE "booking_id" is null and "quote_id" is null and "tour_request_id" is not null and "status" <> 'failed';