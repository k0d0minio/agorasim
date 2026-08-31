# Breakdown: Media estate — the photographs the repo carries and the rows that point at them

- epic-slug: media-estate
- sources: `content-truth/obidos-truth` (2026-08-31, which repointed the one row it owned and left the rest deliberately); tech lens 2026-08-29 (`web/public/images` ≈162 MB of a ≈224 MB repo); `booking-live/rescue-weddings-content` (the five wedding-awards badges PR #30 left unpublished); `web/drizzle/0006_repoint_seed_media.sql` and `0014_obidos_truth.sql` (the guarded-repoint idiom)

## What I understood

Three findings arrived separately and turn out to be one file tree read three ways.

**The rows lie.** Every image path written by the seed migrations names a file that is
no longer in `web/public/images/` — the flat files were reorganised into per-subject
folders and the rows never followed. Public pages render the *catalogue*, not the
`src/content/` arrays, so on any seeded database an operator has not re-uploaded over,
the experience cards and blog heroes are broken images. That is a live bug, and it is
stub 1.

**Some of the tree is waiting on a client answer.** Five Wedding Awards badges sit
unreferenced because the claim behind them — "five years running", 2022–2026 — is an
open client question, and PR #30 correctly declined to publish an award the site
cannot stand behind.

**And the tree is enormous.** 162 MB, with 2–4.5 MB covers and at least one 23 MB and
one 21 MB unreferenced original, carried by every clone and every deploy.

The order is forced by that reading, and it is the whole reason these three are an
epic rather than three parked findings: **you cannot decide what to delete until you
know what is referenced, and you do not know what is referenced until the rows are
repointed and the badge question is answered.** An image audit run first would delete
a photograph stub 1 is about to point a row at.

## Build order

1. seeded-media-dead-paths — repoint the dead seed paths at files that exist — depends-on: none
2. wedding-awards-badges — publish the badges, or drop the claim — depends-on: none *(blocked: client)*
3. image-audit — curate, compress, relocate — depends-on: seeded-media-dead-paths, wedding-awards-badges

## Cross-epic gate on stub 3 — lifted 2026-08-31

`content-truth/wedding-fleet-photos` was the third gate: open, client-blocked, and
wiring a photograph unreferenced at the time. It closed on 2026-08-31 and its epic
archived to `.icm/intake/_done/content-truth/`, so that photograph is referenced now
and only the two in-epic predecessors still gate stub 3. Stub 3 remains the only
destructive work in this repo's backlog; it stays gated on purpose and its stub
carries "propose the split to Jamie before deleting anything".

## Out of scope (whole epic)

- Which photographs the site *should* show — that is `content-truth`'s question, and
  it owns the honest-imagery calls. This epic only makes the tree and the rows agree.
- Moving image hosting to a CDN or Blob store wholesale. Stub 3 may relocate specific
  keep-worthy originals out of git; re-platforming delivery is a different decision.
