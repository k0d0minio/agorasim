# Stub: Repoint the seeded catalogue at photographs that exist

- feature-slug: seeded-media-dead-paths
- epic: media-estate
- priority: P1
- size: M
- depends-on: none
- sequence: 1 of 3
- sources: found by `content-truth/obidos-truth`, 2026-08-31;
  `web/drizzle/0001_seed_mock_content.sql`, `0008_seed_experience_catalogue.sql`,
  `0012_real_prices_two_tours.sql` (every seeded path); `0006_repoint_seed_media.sql`
  and `0014_obidos_truth.sql` (the guarded-repoint idiom to copy)

## Problem

Every image path written into the database by the seed migrations is a file that
is no longer in `web/public/images/`. `0008_seed_experience_catalogue.sql` seeds
`/images/back-of-car.webp`, `/images/front-of-car.webp`, `/images/car.jpg`,
`/images/picnic.jpeg` and `/images/picnic-2.jpeg`;
`0012_real_prices_two_tours.sql` inserted the Óbidos row pointing at
`/images/hero.webp`; `0001_seed_mock_content.sql` seeds the blog drafts at
`/images/car.jpg` and `/images/picnic.jpeg`. The directory today holds only
`logo.png`, `video.mp4` and the per-subject folders — the flat files were
reorganised without the rows following them.

Public pages render the *catalogue*, not `src/content/experiences.ts` (the array
is the fallback for a build with no `DATABASE_URL`), so on any seeded database
that an operator has not since re-uploaded over, the experience cards and blog
heroes are broken images. `content-truth/obidos-truth` repointed the one row it
owned; the rest were left alone deliberately, because which of them are still
seed values and which are operator choices is a question for the live data.

## Proposed change

Read the live `experiences` and `blog_post_drafts` rows, list every `image` /
`image_alt` / `hero_image` whose path has no file behind it, and repoint each to
its real photograph in the current folders — guarded on the dead seed path, in
the idiom of `0006_repoint_seed_media.sql` and `0014_obidos_truth.sql`, so a row
an operator has already fixed is untouched. Keep the shipped array in
`src/content/experiences.ts` in step with whatever the migration writes.

## Prompt

In the agorasim repo (`web/`), fix the dead seeded image paths per
`.icm/intake/media-estate/seeded-media-dead-paths.md`. First establish which rows are
actually affected on the live database (the admin catalogue editor may have
replaced some already), then add a guarded data migration in the style of
`web/drizzle/0014_obidos_truth.sql` repointing each dead path at a file that
exists in `web/public/images/`, and bring `web/src/content/experiences.ts` into
line so the no-database fallback renders the same photographs. Do not delete or
compress any image — that is `media-estate/image-audit.md`, and it must not run before
this one settles. PR on a `claude/` branch; no local checks — CI is the source of
truth.
