# Stub: The generator — real drafts Rita can post from her phone

- feature-slug: social-generator-path
- epic: social-engine
- priority: P2
- size: L
- depends-on: none
- sequence: 1 of 2
- sources: D12; map: `admin/social/page.tsx` renders `previewSocialPosts` fixtures; `social_post_drafts` + `social_platform` enum shaped (`web/src/db/schema.ts:812`); no social workspace exists yet under `workspaces/`

## Problem

Nothing generates social content and the studio is a fixture. Until Meta access
exists, the deliverable is: on-brand post drafts (image + caption + hashtags, per
platform) that Rita can post manually in under a minute each.

## Proposed change

(a) A `workspaces/social-content/` ICM workspace (mirroring geo-content's stage
shape: research/draft/review gates, `_config` voice) producing post batches as
reviewable markdown with image references; (b) a loader into `social_post_drafts`
(pattern from the blog loader); (c) the Social studio real: draft cards with image
preview, caption copy-button, image download/share, per-platform variants, mark-as-
posted (audited), Portuguese, phone-first — Rita's flow is open studio → copy → paste
into Instagram. Fixtures and in-dev marker removed.

## Acceptance criteria (rough)

- [ ] A reviewed batch renders as cards; copy caption + save image ≤3 taps
- [ ] Mark-as-posted tracked; fixtures gone; studio PT, `dev: false`
- [ ] CI green

## Prompt

In the agorasim repo, build the social generator path per
`.icm/intake/social-engine/social-generator-path.md`: create
`workspaces/social-content/` following the stage/gate shape of
`workspaces/geo-content/` (read `workspaces/CONTEXT.md`; gates are Jamie's), a
loader script into `social_post_drafts`, and a real phone-first Portuguese Social
studio replacing the fixtures in `web/src/app/admin/social/page.tsx` (copy-caption,
save-image, per-platform variants, mark-as-posted with audit). Produce one small
demo batch through the workspace for Jamie's gate review. PR on a `claude/` branch;
no local checks — CI is the source of truth.
