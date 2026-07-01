# GEO checklist — Layer 3 reference

Generative Engine Optimization requirements every published page/block must meet. Verify before the
publish stage.

## Content
- [ ] First ~200 words directly and completely answer the page's primary query.
- [ ] Clear H2/H3 hierarchy; one idea per heading.
- [ ] High information density — specific facts, places, durations; no filler.
- [ ] An FAQ section: real questions travellers ask, each answered in 1–3 sentences.
- [ ] Facts match `_config/business-facts.md` exactly (no invented prices/claims).

## Machine-readability (handled by the site, but confirm the content supports it)
- [ ] FAQ content maps to FAQPage JSON-LD (highest-impact GEO schema).
- [ ] Experience content maps to TouristTrip/Product JSON-LD.
- [ ] Page has a unique title + meta description and canonical + hreflang (PT/EN).

## Freshness
- [ ] Content carries a `dateModified`; refresh pages older than ~90 days.

## Crawlability (site-level, already configured)
- robots allows AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, …).
- `sitemap.xml` and `public/llms.txt` list the page.

## Platform notes
- Perplexity/AI Overviews: real-time RAG — reward recent, data-rich, well-structured pages.
- ChatGPT: starts from Bing — ensure Bing indexability.
- Gemini: strong Google organic ranking is a prerequisite.
