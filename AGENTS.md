# Agorasim Toolkit — Layer 0 (repo identity & routing)

This repository is a **toolkit for operating the Agorasim business**, structured in two halves:

- **`web/`** — the product. A Next.js (App Router) + Tailwind + shadcn/ui site rebuilding
  agorasim.pt (currently serving at **agorasim.jamienisbet.com** until Diogo & Rita
  recover the domain). Bilingual PT/EN. This is the funnel destination; all marketing
  leads here. Booking runs through `/reservar` — availability calendar + Stripe Checkout
  into the admin Sales board — on **sandbox keys** (Jamie's Stripe account until the
  client's exists), and has not had its end-to-end pricing pass or the handover to
  Diogo & Rita yet (`.icm/intake/booking-live/`). The enquiry form is the fallback path.
- **`workspaces/`** — the operations engine. ICM workspaces (*Interpretable Context
  Methodology*) that generate GEO/marketing content as reviewable markdown, then publish
  it into the website.

## The business
Guided **classic-car** countryside tours of the **Saloia** region (Sintra · Mafra · Ericeira),
Portugal. Signature experience **Rural Saloia** (~4h30); second tour **Óbidos & Medieval
Villages** (~5h); add-ons Tasco Galapito, Manzwine, Ramilo Wines. (Olaria MZ is retired —
do not reintroduce it.) Capacity is **2 drivers across 4 cars**, so at most two tours leave
at once, in two daily slots (10:00 / 14:00) shared by every route. Contacts:
Diogo +351 926 210 707 · Rita +351 919 272 077 · info@agorasim.pt.

## Where do I go?
- Changing the website (pages, design, content) → work in `web/` (`web/AGENTS.md` has Next.js
  notes; content lives in `web/src/content/`).
- Producing marketing / GEO content → open the relevant workspace under `workspaces/` and follow
  its `CONTEXT.md`. Reviewed output lands in `web/src/content/generated/`.
- Picking up or cutting work items (tickets) → `.icm/intake/` (contract in its `README.md`;
  finished tickets move to `.icm/intake/_done/`).

## Conventions
- **Rendering is ISR, not SSG.** Public pages are prerendered and revalidated hourly
  (`export const revalidate = 3600`) over the Neon catalogue, with the `web/src/content/`
  arrays as a build-time fallback so `next build` needs no `DATABASE_URL`; admin catalogue
  and calendar writes call `revalidatePath`, so an edit is live at once. Two exceptions:
  `/reservar/confirmacao` is `force-dynamic`, and every `/admin` route is dynamic. Because
  public HTML is written once and served from cache, nothing per-request belongs on a
  public page — per-guest content, or a per-request CSP nonce (see
  `web/src/lib/security-headers.ts`).
- The site is bilingual. Content is modelled as `Localized<T>` objects in
  `web/src/content/` — keep PT and EN in sync.
- GEO is a first-class concern: every page ships JSON-LD, canonical + hreflang, and answer-first
  copy. See `web/src/lib/jsonld.ts` and `web/src/lib/seo.ts`.
- ICM principle: **configure the factory, not the product.** Brand voice, facts and style live once
  in `workspaces/_config/`; each pipeline run produces a new deliverable using that configuration.
