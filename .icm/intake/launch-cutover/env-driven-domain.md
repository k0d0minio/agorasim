# Stub: The site knows what domain it's on

- feature-slug: env-driven-domain
- epic: launch-cutover
- priority: P1
- size: S
- depends-on: none
- sequence: 2 of 9
- sources: tech lens: `site.domain = "https://agorasim.pt"` hardcoded in `web/src/content/site.ts`, driving metadataBase, every canonical/hreflang, `sitemap.ts`, `robots.ts` host — while the site serves at agorasim.jamienisbet.com; leaks via `email-layout.ts:74`, `booking-emails.ts:95`, `jsonld.ts:46-48`; Stripe return URLs already env-driven and clean (`stripe.ts:70-77`)

## Problem

Every canonical, hreflang, sitemap URL, JSON-LD id and email footer link points at
agorasim.pt — a domain the site does not serve from. Search engines are being told
the real page lives somewhere it doesn't; email links bounce guests to the parked
domain.

## Proposed change

`site.domain` resolves from `NEXT_PUBLIC_SITE_URL` (falling back to the Vercel URL,
then the hardcoded default) so canonicals/sitemap/robots/JSON-LD/emails follow the
serving domain; on switch day the env flips and nothing else changes. `llms.txt`
URLs are covered by `content-truth/purge-olaria-refresh-llms`'s rewrite — verify it
used the same source of truth (generate it or note the manual step in the runbook).

## Acceptance criteria (rough)

- [ ] Canonicals/hreflang/sitemap/robots/JSON-LD/email links all show the env domain
- [ ] Switch day = one env change + redeploy
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), make the domain env-driven per
`.icm/intake/launch-cutover/env-driven-domain.md`: `web/src/content/site.ts` domain
from `NEXT_PUBLIC_SITE_URL` with sensible fallbacks (mirror `siteUrl()` in
`web/src/lib/stripe.ts`), confirm every consumer (seo.ts, sitemap.ts, robots.ts,
jsonld.ts, email-layout.ts, booking-emails.ts) flows from it, document the env in
`.env.example` by name, and add the switch-day step to the runbook if restored.
PR on a `claude/` branch; no local checks — CI is the source of truth.
