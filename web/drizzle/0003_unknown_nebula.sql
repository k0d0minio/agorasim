CREATE INDEX "blog_post_drafts_status_idx" ON "blog_post_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_post_drafts_updated_at_idx" ON "blog_post_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "email_campaign_drafts_status_idx" ON "email_campaign_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_campaign_drafts_updated_at_idx" ON "email_campaign_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "feature_requests_status_idx" ON "feature_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feature_requests_created_at_idx" ON "feature_requests" USING btree ("created_at");--> statement-breakpoint
-- If this statement fails with a uniqueness violation, the database already holds
-- duplicate (title, category) rows from the pre-fix read-then-insert race. Inspect
-- and remove the extras before re-running:
--   SELECT title, category, count(*) FROM feature_requests
--   WHERE category IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;
CREATE UNIQUE INDEX "feature_requests_title_category_key" ON "feature_requests" USING btree ("title","category");--> statement-breakpoint
CREATE INDEX "geo_content_drafts_status_idx" ON "geo_content_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "geo_content_drafts_updated_at_idx" ON "geo_content_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "social_post_drafts_status_idx" ON "social_post_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "social_post_drafts_updated_at_idx" ON "social_post_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "tour_requests_status_idx" ON "tour_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tour_requests_created_at_idx" ON "tour_requests" USING btree ("created_at");