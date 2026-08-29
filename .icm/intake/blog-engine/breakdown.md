# Breakdown: Blog engine — pipeline to publish, honestly automated

- epic-slug: blog-engine
- sources: proposal feature ② ("self-refreshing blog… without you writing a word" — €900 of sold scope); D11 (Jamie runs the ICM pipeline; drafts land in `blog_post_drafts`; client one-tap publishes); 2026-08-29 map (public blog = 3 hardcoded samples + noindex; Blog studio = fixtures; `workspaces/geo-content` never run; `blog_post_drafts` table shaped and empty)

## What I understood

The sold promise is a blog that refreshes without the client writing a word. The
honest operating model (D11, respecting the estate's no-orchestrator rule): Jamie
runs the ICM content workspace on a cadence; reviewed drafts are loaded into
`blog_post_drafts`; the Blog studio becomes a real review/publish surface where a
tap publishes; the public blog renders published posts and drops its noindex. The
workspace stages exist but have never produced anything — the first batch is part of
delivering the feature, not an afterthought. The disabled newsletter box on the blog
page is not contracted and leaves as part of the build.

## Build order

1. blog-publish-path — DB-backed blog end-to-end: ingestion, studio, public pages — depends-on: none
2. blog-pipeline-first-batch — the workspace runs; 3–5 real articles land and publish — depends-on: blog-publish-path

## Out of scope (whole epic)

- Any scheduler/orchestrator that runs the pipeline itself — Jamie's cadence is the
  automation (D11; estate rule).
- Newsletter capture — not contracted; the disabled input is removed in stub 1.
- Social cross-posting of articles — social-engine/.
