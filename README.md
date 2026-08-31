# Agorasim Toolkit & Operations Manual

A toolkit for operating the **Agorasim** business — guided classic-car countryside tours of the
Saloia region (Sintra · Mafra · Ericeira), Portugal.

Two halves in one repo:

| Path | What it is |
| --- | --- |
| [`web/`](web/) | The website — Next.js (App Router) + Tailwind + shadcn/ui, bilingual PT/EN, GEO-optimized. The funnel destination. |
| [`workspaces/`](workspaces/) | The operations engine — ICM content pipelines that generate GEO/marketing content and publish it into the site. |

See [AGENTS.md](AGENTS.md) for how the two fit together.

## Getting started

```bash
pnpm install
pnpm dev      # http://localhost:3000  (redirects to /pt)
pnpm build    # production build (prerender + ISR; runs without DATABASE_URL)
pnpm lint
```

## The website (`web/`)

- **Routes**: `/[locale]` for `pt` (default) and `en` — Home, `sobre`, `experiencias`
  (+ `[slug]` per experience), `eventos`, `contactos`.
- **Content** lives in `web/src/content/` as `Localized<T>` objects (keep PT/EN in sync). Reviewed
  pipeline output lands in `web/src/content/generated/`.
- **Rendering**: public pages are prerendered and revalidated hourly (ISR,
  `revalidate = 3600`) over the Neon catalogue, falling back to the shipped
  `web/src/content/` arrays when there is no database — that is what lets `next build`
  run without one. `/reservar/confirmacao` and every `/admin` route are dynamic.
- **Booking** goes through `/[locale]/reservar`: calendar availability + Stripe Checkout
  on sandbox keys (Jamie's Stripe account until the client's exists), landing on the
  admin Sales board. The enquiry form remains the fallback path.
- **GEO**: per-page JSON-LD (`web/src/lib/jsonld.ts`), canonical + hreflang (`web/src/lib/seo.ts`),
  `sitemap.ts`, `robots.ts` (allows AI crawlers), and `public/llms.txt`.

## Operations (`workspaces/`)

ICM workspaces — plain folders of markdown that drive human-reviewed content pipelines. Start at
[`workspaces/CONTEXT.md`](workspaces/CONTEXT.md). The `geo-content` pipeline is the template.

## Status / follow-ups

The register — [`.icm/project.md`](.icm/project.md), last run 2026-08-29 — is the source
of truth for what ships. Its Features table, in prose:

**Shipped.** The bilingual PT/EN site with its GEO plumbing (per-page JSON-LD, canonical +
hreflang, `sitemap.ts`, `robots.ts`, `llms.txt` — the mechanisms, not yet the right
content in them), and the admin console (Sales/CRM, calendar, catalogue, auth, audit,
GDPR). Real photos & hero video are wired from
`web/public/images/`; experience photos added from the admin upload to Vercel Blob.

**Everything else is ticketed, not built** — one epic per row under
[`.icm/intake/`](.icm/intake/):

| Area | Where it actually stands |
| --- | --- |
| Instant booking (`booking-live/`) | Checkout and the availability calendar exist, on **sandbox Stripe keys only**. No booking has been taken end to end: the pricing pass against the real price list, the PAX/tier semantics, and the sandbox handover to Diogo & Rita are open. |
| Commission engine (`commission-engine/`) | Not built — there is no Stripe Connect code at all; checkout takes the full amount to the platform account. 4% on tours, 6% on weddings/events, and fees stay off until the Commission & Payments Agreement is signed (D16). |
| Guest self-serve cancellation (`cancellation-selfserve/`) | Not built. "Free cancellation up to 48h" is promised on the checkout, both tours' FAQs and every confirmation email, with no cancellation or refund path behind it. |
| Weddings & events quotes (`quote-flow/`) | Not built. The `casamentos`/`eventos` pages sell it, but an enquiry only lands as a `tour_requests` row with a free-text date — no quote entity, deposit payment link or balance collection. |
| Lifecycle emails (`lifecycle-messages/`) | Only the booking confirmation email exists. The enquiry form acknowledges nothing; there is no day-before reminder or thank-you, no daily scheduler (the one cron is weekly retention) and no sent-log — and the admin Notifications page previews fixtures as though they were live. SMS is deferred to post-live, provider undecided. |
| Blog & social (`blog-engine/`, `social-engine/`) | The public `/blog` route renders **sample posts behind an in-development banner**; the pipeline → drafts → one-tap-publish path and the social generator are open. Meta auto-posting is blocked on client account access. |
| Content truth (`content-truth/`) | The pages ship, but some of what they say is stale: no public price tables (a guest cannot see a price without entering checkout), retired Olaria MZ still sold on the home page, an `llms.txt` that lists it and omits Óbidos, Óbidos facts unconfirmed, the three supplied testimonials unwired, and the referral surface still to be removed. |
| Admin em português (`admin-portugues/`) | The console is still largely English; D4 is Portuguese-only, hardcoded, plus the HIG mobile pass for Rita's phone. |
| Launch cutover (`launch-cutover/`) | The site serves at **agorasim.jamienisbet.com**; `site.domain` is still hardcoded to agorasim.pt, so canonicals, sitemap and email links point at a domain that does not serve. Terms of sale, the compliance footer, error tracking and the DNS switch are open. |

**Out of scope**: the referral programme (dropped 2026-08-29 — never contracted; the
surface is still to be removed) and gift vouchers (interest logged, post-launch at best).
