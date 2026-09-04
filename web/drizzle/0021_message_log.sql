-- ---------------------------------------------------------------------------
-- The message log: what was sent, about whom, and whether it left.
--
-- Nothing recorded a send. "Has this booking already had its day-before
-- reminder?" had no answer, so no message could be scheduled without risking a
-- second copy in somebody's inbox, and the Notifications admin page previewed
-- fixtures rather than facts.
--
-- A row is a claim, not a receipt: it is inserted `sending` before Resend is
-- called and updated after. The two partial unique indexes are what that claim
-- is taken under — one message of each kind, per recipient, per booking (or per
-- enquiry, for the kinds that answer one). `status <> 'failed'` keeps a failed
-- attempt in the log as the record of an attempt while releasing the slot it
-- did not fill, so a retry is possible and a duplicate is not.
--
-- The table is personal data and holds no identifiers: the person is the
-- `tour_requests` FK, and `ON DELETE cascade` means an Art. 17 erasure takes
-- these rows with it (unlike `bookings`, which survives an erasure for its own
-- record-keeping reasons). There is no address, no hash of one and no subject
-- line — the team's subjects quote the guest's name. `provider_message_id`
-- resolves to the whole message in Resend's dashboard, so the retention job
-- clears it when the enquiry is anonymised.
--
-- Two kinds have no sender yet (`balance-request`, `balance-reminder`, for the
-- quote flow): adding an enum value later is a migration, and this one is
-- cheaper now than in the middle of that epic.
--
-- See `src/db/schema.ts`, `src/lib/message-log.ts`, `src/lib/retention.ts` and
-- `src/lib/subject-data.ts`.
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."message_kind" AS ENUM('booking-confirmation', 'booking-cancellation', 'booking-moved', 'enquiry-ack', 'day-before-reminder', 'thank-you-review', 'balance-request', 'balance-reminder');--> statement-breakpoint
CREATE TYPE "public"."message_recipient" AS ENUM('guest', 'team');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "message_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "message_kind" NOT NULL,
	"recipient" "message_recipient" NOT NULL,
	"tour_request_id" uuid,
	"booking_id" uuid,
	"status" "message_status" DEFAULT 'sending' NOT NULL,
	"provider_message_id" text,
	"failure_reason" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_tour_request_id_tour_requests_id_fk" FOREIGN KEY ("tour_request_id") REFERENCES "public"."tour_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_log" ADD CONSTRAINT "message_log_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_booking_kind_key" ON "message_log" USING btree ("kind","recipient","booking_id") WHERE "booking_id" is not null and "status" <> 'failed';--> statement-breakpoint
CREATE UNIQUE INDEX "message_log_enquiry_kind_key" ON "message_log" USING btree ("kind","recipient","tour_request_id") WHERE "booking_id" is null and "tour_request_id" is not null and "status" <> 'failed';--> statement-breakpoint
CREATE INDEX "message_log_booking_idx" ON "message_log" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "message_log_tour_request_idx" ON "message_log" USING btree ("tour_request_id");--> statement-breakpoint
CREATE INDEX "message_log_created_at_idx" ON "message_log" USING btree ("created_at");