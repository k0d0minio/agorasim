CREATE TYPE "public"."enquiry_kind" AS ENUM('tour', 'wedding', 'event');--> statement-breakpoint
CREATE TYPE "public"."experience_kind" AS ENUM('signature', 'complement');--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" "experience_kind" DEFAULT 'complement' NOT NULL,
	"icon" text DEFAULT 'sparkles' NOT NULL,
	"fareharbor_item" text,
	"title" jsonb NOT NULL,
	"tagline" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"duration" jsonb NOT NULL,
	"highlights" jsonb NOT NULL,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image" text NOT NULL,
	"image_alt" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "kind" "enquiry_kind" DEFAULT 'tour' NOT NULL;--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "experiences_active_sort_idx" ON "experiences" USING btree ("active","sort_order");