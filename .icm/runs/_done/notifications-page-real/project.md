# Project: notifications-page-real

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/lifecycle-messages/notifications-page-real.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/app/admin/notifications, web/src/lib/message-log.ts, web/src/lib/admin-messages.ts, web/src/lib/admin-preview.ts, web/src/lib/admin-nav.ts
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- Portuguese only, admin vocabulary from `.icm/docs/admin-pt-inventory.md` (D4); *saldo*, not *restante*, in the admin.
- No SMS or WhatsApp anywhere on the page (D5); no per-message switch (policy-only page).
- No provider id on screen; no schema change; the social preview and `AdminInDevBanner` component stay.

## Context budget

- Define read the `sendLoggedEmail` call sites and `content/emails.ts` subjects to make each card's "to whom" true, beyond its Inputs table.
