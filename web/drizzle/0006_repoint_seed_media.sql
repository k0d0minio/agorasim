-- Repoint seeded mock media at the WebP versions of the photographs.
--
-- `0001_seed_mock_content.sql` inserted a `social_post_drafts` row pointing at
-- `/images/back-of-car.png`. That file is gone: the four photographs that were
-- stored as PNG (each with a fully-opaque, and therefore entirely pointless,
-- alpha channel) are now WebP, which took 16.6 MB down to 1.0 MB.
--
-- This is a new migration rather than an edit to 0001 because 0001 has already
-- run. Editing an applied migration changes its checksum and breaks
-- `drizzle-kit migrate` on every environment that has already seen the old one.
--
-- Written against the whole column rather than one known row: the seed only
-- inserts into an empty table, so which of its rows exist in a given environment
-- depends on when that environment was first migrated.

UPDATE "social_post_drafts"
SET "media_url" = REPLACE("media_url", '.png', '.webp')
WHERE "media_url" IN (
  '/images/back-of-car.png',
  '/images/front-of-car.png',
  '/images/red-car.png',
  '/images/hero.png'
);
