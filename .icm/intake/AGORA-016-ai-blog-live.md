# AGORA-016 · AI blog live: pipeline run → client approval → published articles

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | L |
| Depends on | Launch (AGORA-006/014) — blog flips live alongside or after |
| Sources | AgorasimProposal feature #2 · workspaces/geo-content/ (never run) · Jamie's decision, 24 Aug 2026: Diogo & Rita approve in admin |

## Problem

Proposal feature #2 (paid): a self-refreshing GEO-tuned blog. Today: `/blog` renders
hard-coded samples, noindexed, `/admin/blog` is a disabled preview, `blogPostDrafts` is
write-never, and the `workspaces/geo-content` pipeline has **never produced a single
article**. The promise is "without *them* writing a word" — decision: generation via the
ICM workspace, **Diogo & Rita approve/publish with one tap in the admin**.

## Acceptance

- [ ] First real run of `workspaces/geo-content` produces an initial batch of PT/EN
      articles landing in `blogPostDrafts` (the 03_publish stage gets its real target).
- [ ] `/admin/blog` becomes real: list drafts, preview, one-tap publish/unpublish —
      phone-first, client-facing.
- [ ] Published posts render on `/blog` with `Article`/`BlogPosting` JSON-LD; blog
      flipped live in `routes.ts` (index + sitemap follow).
- [ ] Weekly generation cadence as a repeatable ICM run (human-triggered session
      following the workspace contracts — never a script orchestrator), publish on
      their tap.
- [ ] PT/EN parity on every article; GEO checklist from `workspaces/shared/` applied.
- [ ] CI green.

## Prompt

Take the agorasim blog from shell to live. Read .icm/intake/AGORA-016-ai-blog-live.md,
then workspaces/geo-content/CONTEXT.md and its stage contracts — the repo owns the
pipeline semantics; follow them, do not build tooling around them. The admin publish
surface replaces the preview in web/src/app/admin/blog/. Open a PR on a claude/ branch;
no local checks — CI is the source of truth.
