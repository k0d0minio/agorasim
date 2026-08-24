# AGORA-017 · Social generator + auto-poster: direct Meta Graph API, approval queue

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | L |
| Depends on | Meta app review (external, weeks — **start registration immediately**) · account access via AGORA-019 |
| Sources | AgorasimProposal feature #4 · .icm/docs/social-media-automation.md (spike) · Jamie's decisions, 24 Aug 2026: direct Meta API, IG+FB only, client approves |

## Problem

Proposal feature #4 (paid): on-brand Instagram + Facebook posts generated and scheduled
automatically. Today: a disabled admin preview, a write-never `socialPostDrafts` table,
no social workspace, and no integration of any kind. The spike's decision drivers are now
answered: **Instagram + Facebook only**, the client's own Business accounts, **direct
Meta Graph API** (no recurring vendor fee), drafts **approved by Diogo & Rita in the
admin** before posting.

The critical path is not code: Meta app review + business verification takes **weeks**.
Registration starts now, in parallel with everything else.

## Acceptance

- [ ] **Immediately:** Meta developer app registered; business verification + App Review
      for `instagram_content_publish` / `pages_manage_posts` underway. Needs their FB
      Page + IG Business account admin access (asked in AGORA-019). Log dates — this is
      the long pole.
- [ ] A social workspace generates on-brand PT/EN post drafts (tours, seasons,
      testimonials, blog cross-posts) into `socialPostDrafts`, following the ICM
      contracts.
- [ ] `/admin/social` becomes real: approval queue, scheduling, per-platform status —
      phone-first, client-facing.
- [ ] Cron publishes approved posts via the Graph API (IG Business + FB Page) at a sane
      cadence; token refresh handled; auth failures alert rather than fail silently.
- [ ] Nothing ever posts without an explicit approval tap.
- [ ] CI green.

## Prompt

Build the agorasim social pipeline against the Meta Graph API. Read
.icm/intake/AGORA-017-social-autoposter-meta.md and the spike in
.icm/docs/social-media-automation.md. The app-review step is a human/external action —
prepare it and hand Jamie the exact registration steps first. Tokens via env vars only.
Open a PR on a claude/ branch; no local checks — CI is the source of truth.
