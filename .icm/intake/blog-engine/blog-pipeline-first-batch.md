# Stub: The first batch — the geo-content pipeline finally runs

- feature-slug: blog-pipeline-first-batch
- epic: blog-engine
- priority: P2
- size: M
- depends-on: blog-publish-path
- sequence: 2 of 2
- sources: `workspaces/geo-content/` (stages 01_research → 02_draft → 03_publish, every `output/` empty — never run); `workspaces/_config/` (brand voice, business facts); D11

## Problem

The pipeline that justifies "self-refreshing blog" has never produced a single
artifact. The feature isn't delivered until real articles exist.

## Proposed change

Run the `workspaces/geo-content` pipeline per its own `CONTEXT.md` contracts (the
workspace owns its semantics — follow its stages, respect its human gates) for a
first batch of 3–5 GEO-tuned bilingual articles (Saloia region, the tours, the
partners — grounded in `workspaces/_config/business-facts.md`, which must be
current: Olaria out, real prices). Jamie reviews at the workspace's gates; reviewed
output lands in `web/src/content/generated/blog/` and is loaded + published via the
publish path.

## Acceptance criteria (rough)

- [ ] 3–5 articles through every stage, gates ticked by Jamie
- [ ] Facts check against prices.pdf / info PDF (no invented claims)
- [ ] Published on /blog, both locales; CI green

## Prompt

In the agorasim repo, run the first blog batch per
`.icm/intake/blog-engine/blog-pipeline-first-batch.md`: work inside
`workspaces/geo-content/` following its `CONTEXT.md` stage contracts exactly (read
`workspaces/CONTEXT.md` first; gates are Jamie's checkboxes — never tick them),
verify `workspaces/_config/business-facts.md` is current before drafting, produce
3–5 bilingual GEO articles, and stop at each human gate for Jamie's review. After
his approval, load them with the publish-path script and stage the publish in the
Blog studio for his tap. Ticket-only and content commits per repo conventions; no
local checks — CI is the source of truth.
