CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'cash');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_method" "payment_method" DEFAULT 'stripe' NOT NULL;