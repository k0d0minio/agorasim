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

## Environments

Where the build runs: `.icm/environments.md`.

## The website (`web/`)

- **Routes**: `/[locale]` for `pt` (default) and `en` — Home, `sobre`, `experiencias`
  (+ `[slug]` per experience), `casamentos`, `eventos`, `contactos`, `reservar` (+
  `confirmacao`), `reserva/cancelar/[token]`, `blog`, `privacidade`, `termos`. `/admin` is the
  console (Portuguese, phone-first).
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

## Where things stand

The open work is the stubs under [`.icm/intake/`](.icm/intake/). The project register
(`.icm/project.md`) was removed on 2026-10-27. Its last version is in the git history. The
go-live choreography (registrar
transfer, live Stripe Connect, the sending domain, the €1 test) is
[`.icm/docs/launch-runbook.md`](.icm/docs/launch-runbook.md).

## How work ships

Work flows through tickets in `.icm/intake/` and one pull request per ticket. The loop,
the formats and the two scripts that start and finish a ticket are in `.icm/intake/CONTEXT.md`.