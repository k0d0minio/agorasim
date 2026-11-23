# GEO checklist — Layer 3 reference

Generative Engine Optimization requirements for each thing that the pipelines publish. Verify
them before the publish stage.

There are two kinds of content. A **site page** is a page of the site with its own layout: an
experience page, the home page. A **blog article** is a file in the blog markdown format
(`web/src/lib/blog-markdown.ts`): front matter, then plain paragraphs in PT and in EN. Each
item below says how it applies to each kind.

## Content

| # | Item | Site page | Blog article |
|---|---|---|---|
| C1 | The first ~200 words answer the primary query directly and completely. | yes | yes: the first paragraph of `## pt` and of `## en` is the answer, and the excerpt repeats it in one line |
| C2 | A clear H2/H3 hierarchy, one idea for each heading. | yes | no headings: the format refuses them. One idea for each paragraph |
| C3 | High information density: specific facts, places, durations. No filler. | yes | yes |
| C4 | An FAQ section: real questions that travellers ask, each answered in 1 to 3 sentences. | yes | in prose: three to five question paragraphs, each with its answer paragraph, at the end of the article |
| C5 | The facts match `_config/business-facts.md` exactly. No invented price or claim. | yes | yes |

## Machine-readability (the site does it, but confirm that the content supports it)

| # | Item | Site page | Blog article |
|---|---|---|---|
| M1 | The FAQ content maps to FAQPage JSON-LD (the GEO schema with the highest effect). | yes | not today: an article page has no FAQPage JSON-LD |
| M2 | Experience content maps to TouristTrip/Product JSON-LD. | yes | does not apply. The article page emits Article and BreadcrumbList JSON-LD |
| M3 | A unique title and meta description, a canonical and hreflang (PT/EN). | yes | yes: `title.pt`, `title.en`, `excerpt.pt` and `excerpt.en` are the title and the meta description. The site adds the canonical and the hreflang |

## Freshness

| # | Item | Site page | Blog article |
|---|---|---|---|
| F1 | The content carries a `dateModified`. Refresh a page that is older than ~90 days. | yes | yes: the field `date` of the front matter |

## What a blog article does not meet today

A blog article meets C1, C3, C5, M3 and F1 in full. It meets C2 and C4 only in prose, and it
does not meet M1. The cause is the format, not the article: the article renders as plain
paragraphs and the article page emits no FAQPage JSON-LD. The item B3 of
`.icm/docs/blog-loop.md` (an FAQ in a blog article, with FAQPage JSON-LD) closes C4 and M1.
Until B3 is built, do not call an article "fully GEO-tuned" in a pull request or to the client.

## Crawlability (site-level, already configured)
- robots allows AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, …).
- `sitemap.xml` and `public/llms.txt` list the page. The blog is in the sitemap from the first
  published article.

## Platform notes
- Perplexity/AI Overviews: real-time RAG — reward recent, data-rich, well-structured pages.
- ChatGPT: starts from Bing — ensure Bing indexability.
- Gemini: strong Google organic ranking is a prerequisite.
