# Stub: The WordPress URLs die on Saturday — 301 them onto the new routes

- feature-slug: old-site-redirects
- epic: launch-cutover
- priority: P1
- size: S
- depends-on: none
- sequence: 11 of 14
- sources: crawl of https://agorasim.pt on 2026-09-10 (old WordPress site is live again, Amen LiteSpeed): `/sobre/`, `/contactos/`, `/eventos/`, `/en/`, `/politica-de-privacidade/`, `/politica-de-cookies/`, `/centro-de-arbitragem/`, `/feed/`, `/wp-json/`, `/wp-content/uploads/…`; new route map `web/src/lib/routes.ts`

## Problem

Every inbound link, Google result and Instagram bio that points at an old WordPress
path becomes a 404 the moment DNS moves. The old site has no sitemap to mine, but its
navigation is small and known.

## Proposed change

`next.config` `redirects()` with permanent 301s: `/sobre` → `/pt/sobre`, `/contactos`
→ `/pt/contactos`, `/eventos` → `/pt/eventos`, `/en` → `/en` (locale root),
`/politica-de-privacidade` → `/pt/privacidade`, `/politica-de-cookies` →
`/pt/privacidade`, `/centro-de-arbitragem` → the footer's ADR anchor on
`/pt/contactos` (or the terms page once `terms-of-sale-page` lands); trailing-slash
variants included. `/feed`, `/wp-json`, `/xmlrpc.php`, `/wp-content/*` → 410 Gone via
a small route handler, so crawlers drop them instead of retrying. Add the check to the
runbook's Track H.

## Acceptance criteria (rough)

- [ ] Each listed old path 301s to its new locale route (preview verified with curl -I)
- [ ] WordPress machinery paths return 410
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/launch-cutover/old-site-redirects.md`
and add the permanent redirects to the Next config plus a 410 handler for the WordPress
machinery paths. Match new paths against `web/src/lib/routes.ts`. PR on a `claude/`
branch; no local checks — CI is the source of truth.
