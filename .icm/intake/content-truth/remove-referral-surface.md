# Stub: The referral programme leaves — page, admin, footer, promises

- feature-slug: remove-referral-surface
- epic: content-truth
- priority: P1
- size: S
- depends-on: none
- sequence: 5 of 7
- sources: D2 (2026-08-29 — never contracted, never requested); copy lens sweep list: footer appends "recomendar" on every page (`web/src/components/site-footer.tsx:51`), rewards promise (`web/src/content/referral.ts:54`), admin banner promises automatic tracking (`web/src/app/admin/referrals/page.tsx:33`), nav keys (`dictionaries.ts:48,85`)

## Problem

A dropped, never-contracted feature still ships a public page with invented rewards,
an admin section, a footer link on every page, and dictionary keys — dead promises
that outlive the decision unless removed deliberately.

## Proposed change

Delete `/[locale]/recomendar`, `admin/referrals`, `content/referral.ts`, the footer
append, the nav/dictionary keys, the admin-nav entry, and the route from
`routes.ts`/sitemap logic. Grep for stragglers ("recomendar", "referral", "refer a
friend"). Nothing redirects — the page was noindex'd and never linked externally.

## Acceptance criteria (rough)

- [ ] Routes gone (404 via not-found), zero referral strings remain
- [ ] Footer, nav, admin-nav, sitemap clean
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), execute the referral removal per
`.icm/intake/content-truth/remove-referral-surface.md` (D2 in `.icm/project.md`):
delete the recomendar page, admin referrals page, `web/src/content/referral.ts`, and
every reference (footer, `web/src/i18n/dictionaries.ts`, `web/src/lib/admin-nav.ts`,
`web/src/lib/routes.ts`). Grep-verify no referral vocabulary survives in `web/src`.
PR on a `claude/` branch; no local checks — CI is the source of truth.
