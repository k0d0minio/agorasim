# generated/blog/

Reviewed blog articles, published here by the `workspaces/geo-content` pipeline
(Layer 4 handoff). One markdown file per post, named `<slug>.md`.

Nothing imports these files. They are **loaded into the database**, and the
website reads the database:

```
workspaces/geo-content  →  this directory  →  pnpm blog:load  →  blog_post_drafts
                                                                       ↓
                                                          /admin/blog · "Publicar"
                                                                       ↓
                                                                     /blog
```

```bash
cd web
pnpm blog:load --dry-run   # parse everything, report, write nothing
pnpm blog:load             # load the batch
pnpm blog:load um-dia-perfeito-na-ericeira   # just these slugs
```

A load never publishes: new posts arrive as drafts, and an existing post keeps
whatever status the studio gave it, so re-loading a corrected batch updates the
prose of a live article without taking it off the site. A file that fails to
parse is reported in full and skipped — the rest of the batch still loads.

## The file

```markdown
---
slug: um-dia-perfeito-na-ericeira
date: 2026-07-14
tags: Ericeira, Roteiros
image: /images/rural-saloia/guests-under-olive-tree-hero.webp
imageAlt.pt: Fim de tarde sobre a costa da Ericeira
imageAlt.en: Late afternoon over the Ericeira coastline
title.pt: Um dia perfeito na Ericeira, longe das multidões
title.en: A perfect day in Ericeira, away from the crowds
excerpt.pt: Da primeira bica da manhã ao pôr do sol sobre o Atlântico.
excerpt.en: From the first morning espresso to sunset over the Atlantic.
---

## pt

A Ericeira acorda devagar. Antes dos surfistas chegarem às praias, a vila é dos
pescadores e dos cafés que abrem cedo.

Ao meio da manhã, o segredo é caminhar para sul pelos passadiços.

## en

Ericeira wakes up slowly. Before the surfers reach the beaches, the village
belongs to the fishermen and the early-opening cafés.

Mid-morning, the secret is to walk south along the boardwalks.
```

| Field | Required | Notes |
|---|---|---|
| `slug` | no | Defaults to the filename. Lowercase words joined by hyphens — it becomes the URL. |
| `date` | no | `YYYY-MM-DD`, the article's own freshness date (`dateModified` in its JSON-LD). |
| `tags` | no | Comma-separated, **language-neutral**: places and themes, shown to both audiences. |
| `image` | no | A path under `/images/`, committed to `web/public/`. |
| `imageAlt.pt` / `.en` | with `image` | What the photograph shows. Mandatory whenever there is one — WCAG 2.2 AA. |
| `title.pt` / `.en` | yes | One line each. |
| `excerpt.pt` / `.en` | yes | One line each: the card, and the page's meta description. |
| `## pt` / `## en` | yes | The article. Paragraphs separated by a blank line; source line wraps are joined. |

Both languages, always: `t(value, locale)` has no fallback anywhere on this
site, so a post with one half missing would render blank for half the visitors.
The loader refuses it rather than writing it.

**The body is plain text, not rendered markdown.** Paragraphs reach the page as
`<p>`, so `**bold**`, `## headings`, bullets, blockquotes and backticks would be
read by visitors exactly as typed — the loader refuses those too, and names the
line. Reading time is counted from the words; do not write one.

The format lives in `src/lib/blog-markdown.ts`, and its tests next to it are the
specification.

This README, and any file whose name starts with `_`, are skipped by the loader.
Every other `.md` file here is an article, and one that will not parse is
reported rather than passed over.

Do not hand-edit files here — edit the pipeline output and re-publish. Title and
excerpt can be corrected in the studio for a post already loaded, but the file
is what a re-load restores.
