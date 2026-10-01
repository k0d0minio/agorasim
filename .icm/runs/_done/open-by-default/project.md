# Project: open-by-default

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/open-calendar/open-by-default.md
- scope: .icm/runs/open-calendar/01_scope/output/scope.md
- spec: 02_define/output/spec.md
- touches: web/src/lib/availability.ts, web/src/lib/availability.test.ts, web/src/db/schema.ts, web/src/lib/departure-window.ts, web/src/lib/manual-booking.ts, web/src/lib/manual-booking.test.ts, web/src/lib/booking-move.ts, web/src/lib/booking-move.test.ts, web/src/app/[locale]/reservar/actions.ts, web/src/app/[locale]/reservar/checkout-actions.ts, web/src/app/admin/calendar/actions.ts, web/src/components/admin/availability-calendar.tsx
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- One rule in `lib/availability.ts`; every path asks it with its audience — no second copy of
  the bookability or capacity arithmetic anywhere (D-1, D-4).
- No migration, no row written or deleted: existing closed rows stay blocked with their notes.
- Days are `YYYY-MM-DD` keys in Europe/Lisbon terms (`todayKey`); never an instant in between.
- The guest payload (`toPublicDay`) still carries no `status`, `note` or event-hold reason.
- No new controls on the admin Calendar and no guest-picker restyle — those are
  `admin-block-days` and `guest-calendar-polish`.
- Admin strings come from `.icm/docs/admin-pt-inventory.md`; no new guest copy this run.

## Context budget

- Read beyond Define's Inputs: `lib/availability.ts` in full and targeted excerpts of
  `departure-window.ts`, `manual-booking.ts`, `booking-move.ts`, the two `/reservar` actions,
  `admin/calendar/actions.ts` and `availability-calendar.tsx`, to settle the three open points
  and fill `touches:` with the real callers.
