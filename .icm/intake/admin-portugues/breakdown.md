# Breakdown: Admin em português — the console becomes Diogo & Rita's

- epic-slug: admin-portugues
- sources: Jamie's design brief (2026-08-29: "Apple's norms and standards, intuitive for Diogo and Rita"); D4 (HIG mobile-first + hardcoded PT-only — no i18n rig); 2026-08-29 ux lens ("the HIG layout pass is substantially already on main… the epic's remaining weight is language") + copy lens (idiom inventory)

## What I understood

Rita runs the business from her phone; the console is hardcoded English with
`lang="en"` and no i18n machinery. The mobile-first HIG structure already largely
exists (bottom toolbar, 44px targets, safe areas, typed-DELETE confirms, a written
spec in `web/docs/admin-mobile-design-spec.md`) — so this epic is chiefly a
translation and plain-language pass, done as hardcoded Portuguese (D4), plus the
residual HIG polish. Two structural copy problems ride along: the Sales screen calls
one object three names (leads/enquiries/bookings), and several labels are
engineer-idiom that translates into nothing ("Blog studio", "why it went quiet",
"Content pushed live"). New admin surfaces from other epics (quote builder,
notifications) are written in PT from birth; this epic converts the stock.

## Build order

1. admin-i18n-inventory — the string inventory + PT glossary + naming decisions — depends-on: none
2. translate-admin-core — nav, dashboard, sales, calendar (Rita's dailies) — depends-on: admin-i18n-inventory
3. translate-admin-rest — experiences, settings, users, audit, login, emails to admins — depends-on: translate-admin-core
4. hig-polish-pass — residual HIG items after translation — depends-on: translate-admin-rest

## Out of scope (whole epic)

- Any admin i18n framework or locale toggle — D4 says hardcoded PT; EN can return as
  a future decision, not scaffolding.
- Public-site design — targeted fixes live in their own epics' stubs.
- Guest-facing strings — already bilingual via `Localized<T>`.
