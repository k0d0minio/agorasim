# Breakdown: Social engine — generator now, auto-poster when Meta lets us

- epic-slug: social-engine
- sources: proposal feature ④ (€900 sold scope: "generated and scheduled automatically"); D12 (generator + manual posting now; auto-post gated on client IG/FB access); open-questions pack item 4 (Meta review takes weeks; access never granted); `social_post_drafts` table exists unused; the referenced spike doc `.icm/docs/social-media-automation.md` was deleted at 21d39ea

## What I understood

The auto-poster has a weeks-long external dependency (Meta app review) that cannot
start until the client grants IG/FB admin access — asked in the unsent pack. Waiting
for that would idle a paid feature, so it splits (D12): first a real generator —
drafts produced by an ICM workspace into `social_post_drafts`, surfaced in a real
Social studio where Rita copies/shares each post manually — then the Meta app and
scheduled auto-publishing as a second, blocked stub. The generator half also proves
the content quality before anything posts unattended.

## Build order

1. social-generator-path — workspace → drafts → real Social studio with manual share — depends-on: none
2. meta-autoposter — Meta app, review, scheduled publish — depends-on: social-generator-path *(blocked: client)*

## Out of scope (whole epic)

- Third-party schedulers (Buffer etc.) — rejected 2026-08-29 round 3 in favour of the
  gated Meta build.
- Any platform beyond Instagram + Facebook — the proposal names only those.
