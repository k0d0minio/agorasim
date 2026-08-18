# AGORA-002 · Real facts in: legal blanks, real prices, clean production data

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P0 |
| Size | M |
| Depends on | AGORA-001 (info request sent) |
| Blocked by | — (Section 1 answers arrived 18 Aug: `.icm/docs/agorasim-info.pdf` + `prices.pdf`, local only) |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 1 |

> **Done 2026-08-18**, with one carve-out: RNAAT / insurance / invoicing were left
> blank in the answers, so the privacy draft banner stays and those TODO(legal)
> markers moved to [AGORA-007](../AGORA-007-remaining-legal-blanks.md). Everything
> else landed — and the answers changed the product: real pricing is public/private
> tiered with child/infant bands, there is a second tour (Óbidos & Medieval
> Villages, now fully bookable), two departures a day (10:00/14:00), Olaria MZ is
> retired, and Rural Saloia is 4h30 with a fixed Sintra meeting point.

## Problem

Everything commercial on the site is invented: ~10 `TODO(legal)` markers in
`web/src/content/privacy.ts` (name, NIF, address, retention), illustrative prices in
`web/src/content/booking.ts`, and mock data (`0001_seed_mock_content.sql`,
`web/src/lib/admin-preview.ts`) that must not reach production.

## Acceptance

- [ ] Every `TODO(legal)` in `privacy.ts` filled; draft banner removed.
- [ ] Real prices everywhere prices render; the exact cancellation/refund policy encoded
      (customers pay in full).
- [ ] Availability model locked from the capacity answers (default: one bookable slot per
      day).
- [ ] Production DB clean: mock seed migration and `admin-preview` examples excluded.
- [ ] CI green.

## Prompt

Replace all invented commercial and legal content in the agorasim web app with the real
facts from Diogo & Rita's answers. Read .icm/intake/AGORA-002-real-facts-in.md,
.icm/docs/launch-plan.md (Phase 1) and .icm/docs/information-request-diogo-rita.md for full
context — do not start until the Section 1 answers exist; never invent legal or price
facts. Open a PR on a claude/ branch; do not run local checks — CI is the source of truth.
