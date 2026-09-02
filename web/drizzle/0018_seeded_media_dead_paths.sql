-- ---------------------------------------------------------------------------
-- The seeded catalogue points at photographs that no longer exist.
--
-- `0008_seed_experience_catalogue.sql` wrote `/images/car.jpg`,
-- `/images/picnic.jpeg`, `/images/picnic-2.jpeg`, `/images/front-of-car.webp`
-- and `/images/back-of-car.webp` into `experiences.image`. Every one of those
-- files left `public/images/` when the flat root was reorganised into
-- per-subject folders; the rows never followed. `0014_obidos_truth.sql`
-- repointed the one row it owned (Óbidos, off `/images/hero.webp`); these are
-- the rest.
--
-- Public pages render this table, not `src/content/experiences.ts` — the array
-- is only the fallback for a build with no `DATABASE_URL` — so these are live
-- broken images. Checked against production before writing this migration:
-- all four cards still served the dead seed path with the seed alt text
-- untouched, and each path is a 404. Nothing had been re-uploaded from
-- /admin/experiences.
--
-- Where each row goes is not a blind file-rename. Two of the seed paths were
-- the wrong subject to begin with — a picnic hamper standing in for a family
-- meal at the Tasco, the front of a wedding 2CV standing in for a vineyard —
-- so each row lands on the photograph the shipped array already names for that
-- slug. `src/content/experiences.ts` therefore needs no change: this migration
-- brings the table up to the array, not the other way round.
--
-- Guarded in the idiom of `0006_repoint_seed_media.sql` and
-- `0014_obidos_truth.sql`: each statement fires only where the dead seed path
-- is still in place, so a row Diogo & Rita have since re-uploaded over from
-- /admin/experiences is left exactly as they chose it. On an untouched
-- database all four apply; on an edited one, only the untouched rows move.
--
-- Two things the stub behind this migration expected to find here, and why
-- they are absent:
--
--   * The seeded blog and social drafts. `0001_seed_mock_content.sql` did point
--     `blog_post_drafts.hero_image` at `/images/car.jpg` and
--     `/images/picnic.jpeg`, and `social_post_drafts.media_url` at three dead
--     paths — but `0012_real_prices_two_tours.sql` then deleted every row in
--     both tables, so on any database migrated past 0012 there is nothing left
--     to repoint. Confirmed by replaying 0000–0017 on an empty Postgres: both
--     tables come out empty, which is also why the public blog renders its
--     "nothing published yet" state.
--   * `olaria-mz`, which still holds `/images/back-of-car.webp`. That
--     experience is retired (`0012` set `active = false`) so no page reads the
--     row, and the estate holds no pottery photograph to point it at — a
--     wedding 2CV crop would be a worse answer than a path nothing renders.
-- ---------------------------------------------------------------------------

-- Rural Saloia: the same photograph, at the address it moved to.
-- `public/images/README.md` records `fleet/citroen-2cv-agorasim-door-detail.jpg`
-- as "was `/images/car.jpg`", so the seeded alt text still describes the frame
-- and stays exactly as it is.
UPDATE "experiences" SET
  "image" = '/images/fleet/citroen-2cv-agorasim-door-detail.jpg',
  "updated_at" = now()
WHERE "slug" = 'rural-saloia'
  AND "image" = '/images/car.jpg';--> statement-breakpoint

-- Tasco Galapito: the seed pointed at a picnic hamper, which is the Rural
-- Saloia table, not this one. The Tasco is a family meal around the long
-- granite table indoors, and the alt text moves with the subject.
UPDATE "experiences" SET
  "image" = '/images/tasco-galapito/cover-leitao-long-table.jpg',
  "image_alt" = '{"pt":"Leitão assado servido na mesa comprida do Tasco Galapito","en":"Roast suckling pig served on the long table at Tasco Galapito"}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'tasco-galapito'
  AND "image" = '/images/picnic.jpeg';--> statement-breakpoint

-- Manzwine: a tasting table rather than a second picnic frame. The seeded alt
-- already described a tasting in the Mafra region, and still does.
UPDATE "experiences" SET
  "image" = '/images/manzwine/tasting-table-cheese-board.jpg',
  "updated_at" = now()
WHERE "slug" = 'manzwine'
  AND "image" = '/images/picnic-2.jpeg';--> statement-breakpoint

-- Ramilo Wines: the seed pointed at the front of a wedding 2CV under an alt
-- text promising organic vineyards near the Atlantic. The glass of Colares in
-- the vineyard is that promise, and the alt now names what is in the frame.
UPDATE "experiences" SET
  "image" = '/images/ramilo-wines/colares-glass-in-the-vineyard.jpg',
  "image_alt" = '{"pt":"Copo de vinho de Colares nas vinhas da Ramilo, junto ao Atlântico","en":"A glass of Colares wine in Ramilo''s vineyards near the Atlantic"}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'ramilo-wines'
  AND "image" = '/images/front-of-car.webp';
