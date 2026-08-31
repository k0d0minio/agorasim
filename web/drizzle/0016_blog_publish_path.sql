-- ---------------------------------------------------------------------------
-- The blog stops being a preview: two columns the publish path needs.
--
-- `blog_post_drafts` was shaped before anything wrote to it (D11), and two
-- things the public page cannot do without were never on it:
--
--   * `published_at` — the moment someone tapped Publicar. `status` says
--     whether a post is live; nothing said *when*, so the index had no honest
--     order and the article's JSON-LD had no `datePublished`. Ordering on
--     `updated_at` instead would have re-shuffled the whole blog every time a
--     typo was fixed in an old post.
--   * `hero_image_alt` — alt text per locale for `hero_image`. The public site
--     is held to WCAG 2.2 AA (D14), and there was no field an author could put
--     a description in; the alternative was inventing one from the title, which
--     is a caption of the heading rather than a description of the photograph.
--
-- Both are nullable and neither is backfilled: the table is empty everywhere
-- today, and the loader script fills them for the rows it brings in.
--
-- Numbered 0016 rather than 0015: the cancellation token landed on main first,
-- and two migrations may not share an index.
-- ---------------------------------------------------------------------------
ALTER TABLE "blog_post_drafts" ADD COLUMN "hero_image_alt" jsonb;--> statement-breakpoint
ALTER TABLE "blog_post_drafts" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
-- What `/blog` reads: published rows, newest first.
CREATE INDEX "blog_post_drafts_published_at_idx" ON "blog_post_drafts" USING btree ("published_at");
