# Agorasim Toolkit

A toolkit for operating the **Agorasim** business — guided classic-car countryside tours of the
Saloia region (Sintra · Mafra · Ericeira), Portugal.

Two halves in one repo:

| Path | What it is |
| --- | --- |
| [`web/`](web/) | The website — Next.js (App Router) + Tailwind + shadcn/ui, bilingual PT/EN, GEO-optimized. The funnel destination. |
| [`workspaces/`](workspaces/) | The operations engine — ICM content pipelines (see `icm.pdf`) that generate GEO/marketing content and publish it into the site. |

See [CLAUDE.md](CLAUDE.md) for how the two fit together.

## Getting started

```bash
pnpm install
pnpm dev      # http://localhost:3000  (redirects to /pt)
pnpm build    # production build (static)
pnpm lint
```

## The website (`web/`)

- **Routes**: `/[locale]` for `pt` (default) and `en` — Home, `sobre`, `experiencias`
  (+ `[slug]` per experience), `eventos`, `contactos`.
- **Content** lives in `web/src/content/` as `Localized<T>` objects (keep PT/EN in sync). Reviewed
  pipeline output lands in `web/src/content/generated/`.
- **Booking** goes through FareHarbor. Set the shortname to activate the booking lightbox:

  ```bash
  # web/.env.local
  NEXT_PUBLIC_FAREHARBOR_SHORTNAME=your-fareharbor-shortname
  ```

  Until it's set, "Reservas" CTAs fall back to the contact page.
- **GEO**: per-page JSON-LD (`web/src/lib/jsonld.ts`), canonical + hreflang (`web/src/lib/seo.ts`),
  `sitemap.ts`, `robots.ts` (allows AI crawlers), and `public/llms.txt`.

## Operations (`workspaces/`)

ICM workspaces — plain folders of markdown that drive human-reviewed content pipelines. Start at
[`workspaces/CONTEXT.md`](workspaces/CONTEXT.md). The `geo-content` pipeline is the template.

## Status / follow-ups

- Real photos & hero video are wired from `web/public/images/`.
- FareHarbor shortname + per-experience item IDs still needed to go live with booking.
- Later: more pipelines (blog/social/email) and a native booking form (the end-goal funnel).
