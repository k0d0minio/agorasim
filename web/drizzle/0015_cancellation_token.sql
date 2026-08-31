-- ---------------------------------------------------------------------------
-- Cancellation: the credential, and the "who" next to the "when".
--
-- "Free cancellation up to 48 hours before" is promised on the checkout, in
-- both tours' FAQs and in every confirmation email, and no cancellation path
-- exists in any form. The first thing missing is not a page — it is a way for
-- a guest to prove the booking is theirs. `bookings` deliberately holds no
-- guest identity (that lives once, on `tour_requests`), so there is nobody to
-- log in as: the token in the emailed link *is* the authentication.
--
-- What lands here is that token, hashed, and the state columns a cancellation
-- has to record. Nothing reads them yet — the public route is the next change.
--
-- No backfill, on purpose. Existing cancelled rows keep `cancelled_via` null,
-- which is the only honest value: whether a row cancelled in June was a phone
-- call to Rita or an expired Stripe session is not recoverable, and writing a
-- guess into it would put a lie in the record. Null means "before this column",
-- and only that.
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."cancelled_via" AS ENUM('guest', 'admin', 'system');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_via" "cancelled_via";--> statement-breakpoint
-- An HMAC of the token, never the token: a dump of this table must not be a
-- stack of working cancel links. See `src/lib/cancellation-token.ts`.
ALTER TABLE "bookings" ADD COLUMN "cancellation_token_hash" text;--> statement-breakpoint
-- The cancel link carries the token and nothing else, so resolving a booking
-- is a lookup by digest. Unique because two bookings sharing a token would
-- hand one guest another's booking; Postgres allows any number of nulls under
-- a unique index, which is what keeps every existing row legal.
CREATE UNIQUE INDEX "bookings_cancellation_token_key" ON "bookings" USING btree ("cancellation_token_hash");
