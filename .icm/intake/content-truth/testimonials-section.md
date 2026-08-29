# Stub: Social proof — the three testimonials go live

- feature-slug: testimonials-section
- epic: content-truth
- priority: P1
- size: M
- depends-on: none
- sequence: 2 of 7
- sources: info PDF §2.5 (three quotes with publish OK: Jacob & Danita (Canada), Madeline & Elliot (Australia), Brian & Elizabeth (USA), photos supplied); product lens ("zero social proof… the absent quotes are the conversion gap"); photos already at `web/public/images/testimonials/` (3 files, zero references)

## Problem

The client gathered exactly what was asked — three vivid quotes with permission and
photos — and none of it renders anywhere. The photos sit unreferenced in the repo.

## Proposed change

A `content/testimonials.ts` module (quotes tightened to 2–4 sentences each,
first-names + country, PT translations written — the originals are EN) and a
testimonial section component: on the home page (below the experiences strip) and on
each experience page. Photos with real alt text. Review JSON-LD **not** added — no
aggregateRating games (legal lens: display duties attach if reviews render as
structured data; keep it copy).

## Acceptance criteria (rough)

- [ ] Three testimonials with photos on home; relevant ones on experience pages
- [ ] PT versions written, not machine-flat; alt text real
- [ ] No review structured-data added; CI green

## Prompt

In the agorasim repo (`web/`), build the testimonials section per
`.icm/intake/content-truth/testimonials-section.md`: quotes verbatim-tightened from
`.icm/docs/agorasim-info.pdf` §2.5 (or its redacted successor) into a new
`web/src/content/testimonials.ts` (`Localized` pattern — translate to PT in the
guests' warm register), a section component used on the home page and experience
pages, images from `web/public/images/testimonials/`. Do not add review/rating
structured data. PT/EN in sync. PR on a `claude/` branch; no local checks — CI is the
source of truth.
