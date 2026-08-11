# AGORA-002 · Real facts in: legal blanks, real prices, clean production data

| | |
|---|---|
| Status | blocked |
| Type | feature |
| Priority | P0 |
| Size | M |
| Depends on | AGORA-001 (info request sent) |
| Blocked by | Diogo & Rita's Section 1 answers (`.icm/docs/information-request-diogo-rita.md`) |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 1 |

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
