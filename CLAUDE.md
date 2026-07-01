# Agorasim Toolkit — Layer 0 (repo identity & routing)

This repository is a **toolkit for operating the Agorasim business**, structured in two halves:

- **`web/`** — the product. A Next.js (App Router) + Tailwind + shadcn/ui site rebuilding
  agorasim.pt. Bilingual PT/EN. This is the funnel destination; all marketing leads here and,
  eventually, to a booking form. Booking currently goes through FareHarbor.
- **`workspaces/`** — the operations engine. ICM workspaces (see `icm.pdf`, *Interpretable
  Context Methodology*) that generate GEO/marketing content as reviewable markdown, then publish
  it into the website.

## The business
Guided **classic-car** countryside tours of the **Saloia** region (Sintra · Mafra · Ericeira),
Portugal. Signature experience **Rural Saloia**; add-ons Tasco Galapito, Manzwine, Ramilo Wines,
Olaria MZ. Contacts: Diogo +351 926 210 707 · Rita +351 919 272 077 · info@agorasim.pt.

## Where do I go?
- Changing the website (pages, design, content) → work in `web/` (`web/AGENTS.md` has Next.js
  notes; content lives in `web/src/content/`).
- Producing marketing / GEO content → open the relevant workspace under `workspaces/` and follow
  its `CONTEXT.md`. Reviewed output lands in `web/src/content/generated/`.

## Conventions
- The site is fully static (SSG) and bilingual. Content is modelled as `Localized<T>` objects in
  `web/src/content/` — keep PT and EN in sync.
- GEO is a first-class concern: every page ships JSON-LD, canonical + hreflang, and answer-first
  copy. See `web/src/lib/jsonld.ts` and `web/src/lib/seo.ts`.
- ICM principle: **configure the factory, not the product.** Brand voice, facts and style live once
  in `workspaces/_config/`; each pipeline run produces a new deliverable using that configuration.
