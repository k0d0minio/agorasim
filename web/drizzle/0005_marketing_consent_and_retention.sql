ALTER TABLE "tour_requests" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "marketing_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "marketing_consent_version" text;--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "anonymised_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tour_requests_email_idx" ON "tour_requests" USING btree ("email");