CREATE TYPE "public"."opt_out_via" AS ENUM('page', 'one-click');--> statement-breakpoint
CREATE TABLE "email_opt_outs" (
	"address_hash" text PRIMARY KEY NOT NULL,
	"via" "opt_out_via" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "no_show_at" timestamp with time zone;