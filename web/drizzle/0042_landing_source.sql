ALTER TABLE "tour_requests" ADD COLUMN "landing_utm_source" text;--> statement-breakpoint
ALTER TABLE "tour_requests" ADD COLUMN "landing_referrer_host" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "landing_utm_source" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "landing_referrer_host" text;