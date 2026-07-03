CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'approved', 'published');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('pt', 'en');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('new', 'contacted', 'quoted', 'booked', 'archived');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'facebook', 'tiktok', 'youtube', 'linkedin');--> statement-breakpoint
CREATE TABLE "blog_post_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"excerpt" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_image" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"date_modified" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_drafts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_campaign_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"subject" jsonb NOT NULL,
	"preheader" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"segment" text DEFAULT 'newsletter' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_campaign_drafts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "geo_content_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"target_page" text NOT NULL,
	"target_query" text,
	"pt" jsonb NOT NULL,
	"en" jsonb NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"date_modified" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geo_content_drafts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "social_post_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" "social_platform" NOT NULL,
	"caption" jsonb NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience_slug" text,
	"media_url" text,
	"scheduled_for" timestamp with time zone,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"locale" "locale" DEFAULT 'pt' NOT NULL,
	"experience_slug" text,
	"add_ons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"party_size" integer,
	"preferred_date" text,
	"message" text,
	"status" "request_status" DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
