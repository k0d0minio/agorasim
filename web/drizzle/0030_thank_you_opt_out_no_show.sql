-- Idempotent on purpose: this migration was first generated as 0029 and applied under that
-- stamp to the run's and the PR preview's database branches before main took 0029 for
-- quote_refunds. Re-numbered as 0030, it must also land on those branches, where the
-- objects already exist; on UAT and production it creates them exactly as generated.
DO $$ BEGIN
	CREATE TYPE "public"."opt_out_via" AS ENUM('page', 'one-click');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_opt_outs" (
	"address_hash" text PRIMARY KEY NOT NULL,
	"via" "opt_out_via" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "no_show_at" timestamp with time zone;
