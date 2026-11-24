ALTER TABLE "quotes" ADD COLUMN "kind" text DEFAULT 'event' NOT NULL;--> statement-breakpoint
UPDATE "quotes" SET "kind" = 'tour' WHERE "hold_vehicle_class" IS NOT NULL;