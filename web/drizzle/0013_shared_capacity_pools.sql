-- ---------------------------------------------------------------------------
-- AGORA-012 · Availability becomes shared driver and vehicle pools.
--
-- The calendar was per tour: one row per (tour, day, departure), with a seat
-- count. That let two tours sell the same 10:00 twice over, because the real
-- constraint is neither per tour nor counted in seats — it is **two drivers
-- across four cars for the whole business** (info PDF §1.5). A row is now one
-- (day, departure), carrying the roster; which car a booking needs is decided
-- from the route and the party in `src/lib/fleet.ts`, and recorded on the
-- booking.
--
-- Two data steps sit inside the schema change, and both are load-bearing:
-- collapsing the per-tour rows before the new unique index can exist, and
-- backfilling every existing booking with the car it must have taken. The
-- generated DDL alone would fail on the first and silently mis-state the
-- second.
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."vehicle_class" AS ENUM('classic-small', 'classic-van', 'touring');--> statement-breakpoint
-- The old shape has to go before the new one can be asserted: the unique index
-- below is on (date, slot) alone, which today's rows violate by design.
DROP INDEX "availability_experience_date_slot_key";--> statement-breakpoint
DROP INDEX "availability_experience_date_idx";--> statement-breakpoint
ALTER TABLE "availability" ADD COLUMN "drivers" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
-- Collapse the per-tour calendars into one row per departure.
--
-- An **open** row wins: the team asserting "we can run the countryside tour on
-- Saturday morning" was an assertion that they had a driver that morning, and
-- the Óbidos row saying `closed` next to it meant "we are not running Óbidos",
-- which is a routing decision the shared model no longer needs. Ties break on
-- the oldest row, then on id, so the result does not depend on scan order.
-- The losing rows' notes go with them; the survivor keeps its own.
DELETE FROM "availability" WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "date", "slot"
      ORDER BY ("status" = 'open') DESC, "created_at", "id"
    ) AS rn
    FROM "availability"
  ) ranked WHERE rn > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "availability_date_slot_key" ON "availability" USING btree ("date","slot");--> statement-breakpoint
CREATE INDEX "availability_date_idx" ON "availability" USING btree ("date");--> statement-breakpoint
ALTER TABLE "availability" DROP COLUMN "experience_slug";--> statement-breakpoint
ALTER TABLE "availability" DROP COLUMN "capacity";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "vehicle_class" "vehicle_class" DEFAULT 'classic-small' NOT NULL;--> statement-breakpoint
-- Every existing booking gets the car it must in fact have gone out in, by the
-- same rule `assignVehicle` applies to a new one: Óbidos is not driven in the
-- classics (§2.6), up to three guests fit a small classic, more take the T3.
-- A row above eight was sold under the old model, before the fleet arithmetic
-- existed; it is recorded against the largest car rather than dropped, so the
-- departure it is on reads as fuller rather than emptier than it is.
UPDATE "bookings" SET "vehicle_class" = CASE
  WHEN "experience_slug" = 'obidos-medieval-villages' THEN 'touring'
  WHEN "party_size" <= 3 THEN 'classic-small'
  ELSE 'classic-van'
END::"public"."vehicle_class";--> statement-breakpoint
-- `exclusive` said "this private booking owns the whole slot", which stopped
-- being a sentence about anything once the slot stopped belonging to one tour.
-- Nothing is lost: `mode` still records which half of the price list was sold,
-- and every booking is private to its car now regardless.
ALTER TABLE "bookings" DROP COLUMN "exclusive";
