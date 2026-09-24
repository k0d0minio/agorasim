ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'quote-refunded';--> statement-breakpoint
DROP INDEX "message_log_quote_receipt_key";--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "quote_payment_id" uuid;--> statement-breakpoint
ALTER TABLE "message_log" ADD COLUMN "refunded_total_cents" integer;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_quote_payment_id_quote_payments_id_fk" FOREIGN KEY ("quote_payment_id") REFERENCES "public"."quote_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_quote_refund_key" ON "message_log" USING btree ("kind","recipient","quote_payment_id","refunded_total_cents") WHERE "quote_payment_id" is not null and "status" <> 'failed';--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_quote_receipt_key" ON "message_log" USING btree ("kind","recipient","quote_id") WHERE "booking_id" is null and "quote_id" is not null and "quote_sent_at" is null and "quote_payment_id" is null and "status" <> 'failed';