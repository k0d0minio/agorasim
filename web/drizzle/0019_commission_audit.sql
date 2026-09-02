-- ---------------------------------------------------------------------------
-- Commission: what the platform was paid on a booking, and why that number.
--
-- The Commission & Payments Agreement (§4) is 4% of the booking total with a
-- €10 floor and a €50 cap, taken as a Stripe Connect application fee at the
-- moment the guest pays. Nothing has recorded one: the fee was invisible
-- outside the Stripe dashboard, which makes "reconcile this month" a job of
-- matching two lists by hand and a refund a question nobody could answer from
-- this table.
--
-- Five columns, all nullable, and null is a fact rather than a gap: every
-- booking taken so far was a plain platform charge with no fee on it, and a
-- deployment with no connected account still takes none. So there is no
-- backfill — the rows that predate this genuinely had no commission.
--
-- The amount is Stripe's own figure, read back from the charge at
-- confirmation rather than copied from what checkout asked for; the rate and
-- the bound are ours, and they are what explain a €50 fee as either the
-- percentage or the cap. See `lib/commission.ts` and `lib/booking-checkout.ts`.
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."commission_bound" AS ENUM('rate', 'floor', 'cap');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "application_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "commission_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "commission_bound" "commission_bound";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_charge_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_connected_account_id" text;
