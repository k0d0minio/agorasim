-- ---------------------------------------------------------------------------
-- Quotes: the events and weddings side of the business gets a table.
--
-- Weddings and events are quoted per job, not sold off a price list (info PDF
-- §2.3), and until now an event's only home was a `tour_requests` row. That row
-- holds no money, no terms, and — the part that blocks everything downstream —
-- a *free-text* date: "late August", "flexible". The proposal (§5) promises the
-- balance link goes out automatically 14 days before the event, and "14 days
-- before 'late August'" is not a query. `quotes.event_date` is a real `date`,
-- so T−14 is one indexed comparison.
--
-- Two tables, because a quote's payments are not two sets of columns on it. The
-- agreement (§5) collects a 30% deposit and a balance, each with its own Stripe
-- session, its own proportional 6% application fee, its own due date and its
-- own status. Flattened into `deposit_*`/`balance_*` columns, a re-issued link
-- or a second partial payment overwrites the record of the first;
-- `quote_payments` is a child table so it cannot.
--
-- The PII split is the one `bookings` already keeps: the couple stay on
-- `tour_requests` — the single home for names, emails and phone numbers that
-- the retention job, the subject-access export and the erasure path already
-- know about — and the foreign key is ON DELETE SET NULL. An Art. 17 erasure
-- therefore leaves the financial record standing with no name on it, which is
-- the correct outcome rather than an accident. `quote_payments` cascades from
-- its quote instead: no person in it, and an instalment of a quote that does
-- not exist is a record of nothing.
--
-- Nothing is backfilled and nothing is dropped: there are no events in the
-- database to convert. See `web/src/db/schema.ts` and `web/src/lib/quotes.ts`.
-- ---------------------------------------------------------------------------
CREATE TYPE "public"."quote_payment_kind" AS ENUM('deposit', 'balance', 'other');--> statement-breakpoint
CREATE TYPE "public"."quote_payment_status" AS ENUM('pending', 'issued', 'paid', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'deposit_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "quote_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"kind" "quote_payment_kind" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"due_date" date,
	"status" "quote_payment_status" DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"stripe_connected_account_id" text,
	"application_fee_cents" integer,
	"commission_rate_bps" integer,
	"refunded_amount_cents" integer DEFAULT 0 NOT NULL,
	"refunded_fee_cents" integer DEFAULT 0 NOT NULL,
	"stripe_refund_id" text,
	"refunded_at" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_payments_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_request_id" uuid,
	"created_by_user_id" uuid,
	"event_date" date NOT NULL,
	"venue" text,
	"locale" "locale" DEFAULT 'pt' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"deposit_percent" integer DEFAULT 30 NOT NULL,
	"terms_window_days" integer DEFAULT 30 NOT NULL,
	"terms_version" text,
	"accepted_terms_version" text,
	"accepted_at" timestamp with time zone,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"access_token_hash" text,
	"sent_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_payments" ADD CONSTRAINT "quote_payments_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tour_request_id_tour_requests_id_fk" FOREIGN KEY ("tour_request_id") REFERENCES "public"."tour_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_admin_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_payments_quote_idx" ON "quote_payments" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quote_payments_status_due_idx" ON "quote_payments" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "quotes_tour_request_idx" ON "quotes" USING btree ("tour_request_id");--> statement-breakpoint
CREATE INDEX "quotes_status_event_date_idx" ON "quotes" USING btree ("status","event_date");--> statement-breakpoint
CREATE INDEX "quotes_event_date_idx" ON "quotes" USING btree ("event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_access_token_key" ON "quotes" USING btree ("access_token_hash");