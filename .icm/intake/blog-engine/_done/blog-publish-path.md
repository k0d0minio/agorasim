# Stub: The publish path — drafts in the database, one tap to live

- feature-slug: blog-publish-path
- epic: blog-engine
- priority: P2
- size: L
- depends-on: none
- sequence: 1 of 2
- sources: D11; map: `content/blog.ts` sampleBlogPosts hardcoded, `blog/page.tsx` noindex + disabled newsletter input, `admin/blog/page.tsx` fixtures, `blog_post_drafts` table shaped (`web/src/db/schema.ts:786`) and written by nothing

## Problem

Every piece of the blog is a stub: hardcoded public posts behind noindex, a fixture
admin, an empty table, no way in for pipeline output and no way out to the page.

## Proposed change

End-to-end: (a) an ingestion path — a repo script (`web/scripts/load-blog-drafts.ts`,
run by Jamie after a pipeline review, reading reviewed markdown from
`web/src/content/generated/blog/`) that upserts `blog_post_drafts`; (b) the Blog
studio real — list drafts, preview, edit title/excerpt, **Publicar** (and
unpublish), owner-gated, audited, PT strings; (c) public `/blog` + `/blog/[slug]`
render published posts from the DB (ISR like the catalogue), sample posts and the
newsletter box removed, noindex lifted only when a first real post is published
(`liveKeys`); (d) JSON-LD Article + sitemap entries per published post.

## Acceptance criteria (rough)

- [ ] Reviewed markdown → draft row → tap Publicar → live bilingual post, indexed
- [ ] Unpublish works; drafts invisible publicly; fixtures gone
- [ ] Blog studio PT, `dev: false`; CI green

## Prompt

In the agorasim repo (`web/`), build the blog publish path per
`.icm/intake/blog-engine/blog-publish-path.md` (read it and D11 in
`.icm/project.md` first): loader script from `web/src/content/generated/blog/` into
`blog_post_drafts`, a real admin Blog studio (replace the fixtures in
`web/src/app/admin/blog/page.tsx`; `requireAdmin` + audit conventions; Portuguese
strings), DB-backed public blog pages replacing `sampleBlogPosts`, `liveKeys`/noindex
lifted when a published post exists, Article JSON-LD + sitemap. Follow the
catalogue's ISR pattern (`web/src/lib/experience-catalogue.ts`). PR on a `claude/`
branch; no local checks — CI is the source of truth.
