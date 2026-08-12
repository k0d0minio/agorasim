CREATE TYPE "public"."availability_slot" AS ENUM('full_day', 'morning', 'afternoon');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"slot" "availability_slot" DEFAULT 'full_day' NOT NULL,
	"capacity" integer DEFAULT 3 NOT NULL,
	"status" "availability_status" DEFAULT 'open' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "availability_date_slot_key" ON "availability" USING btree ("date","slot");--> statement-breakpoint
CREATE INDEX "availability_date_idx" ON "availability" USING btree ("date");