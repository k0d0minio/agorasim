CREATE TYPE "public"."admin_role" AS ENUM('owner', 'collaborator');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'collaborator' NOT NULL,
	"sessions_valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- `submitted_by` was a free-text name typed by whoever raised the request,
-- back when /admin was one shared login. It is renamed rather than dropped so
-- nothing is lost; `submitted_by_user_id` below is what new rows use.
ALTER TABLE "feature_requests" RENAME COLUMN "submitted_by" TO "submitted_by_legacy";--> statement-breakpoint
ALTER TABLE "feature_requests" ADD COLUMN "submitted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_admin_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_submitted_by_user_id_admin_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;