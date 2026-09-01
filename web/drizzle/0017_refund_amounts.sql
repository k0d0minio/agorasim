-- ---------------------------------------------------------------------------
-- Refunds: how much went back, and Stripe's handle for it.
--
-- `booking_status` has said `refunded` since the table was created, and nothing
-- has ever been able to write it: a refund issued in the Stripe dashboard left
-- the booking `confirmed`, the departure still counting the car, and no record
-- anywhere of the money. The admin cancel-and-refund action is the first writer.
--
-- Three columns rather than a flag, because a refund is an amount. The team
-- refunds in full for weather and part of a total for a late cancellation met
-- with goodwill, and "€340 refunded" versus "€170 refunded" is the first thing
-- a guest asks about. `refunded_amount_cents` is cumulative and defaults to 0,
-- which is the true value for every row that exists today — so no backfill and
-- no null to interpret.
--
-- Seats need no column: `lib/bookings.ts` counts only `confirmed` rows and
-- pending rows whose hold is live, so a booking moved to `refunded` or
-- `cancelled` stops holding its driver and its car the moment the status lands.
-- ---------------------------------------------------------------------------
ALTER TABLE "bookings" ADD COLUMN "refunded_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- `re_…`. The join between this row and the money in Stripe.
ALTER TABLE "bookings" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "refunded_at" timestamp with time zone;
