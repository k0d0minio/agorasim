ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'balance-request-manual';--> statement-breakpoint
-- The balance now falls due the day before the event, not 14 days before. Move every open balance row to the new date. Paid, written-off and refunded rows keep the date they were paid under.
UPDATE "quote_payments" SET "due_date" = "quotes"."event_date" - 1 FROM "quotes" WHERE "quote_payments"."quote_id" = "quotes"."id" AND "quote_payments"."kind" = 'balance' AND "quote_payments"."status" IN ('pending', 'issued');
