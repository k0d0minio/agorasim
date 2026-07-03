CREATE TYPE "public"."feature_request_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."feature_request_status" AS ENUM('new', 'planned', 'in_progress', 'completed', 'declined');--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"submitted_by" text,
	"priority" "feature_request_priority" DEFAULT 'medium' NOT NULL,
	"status" "feature_request_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
