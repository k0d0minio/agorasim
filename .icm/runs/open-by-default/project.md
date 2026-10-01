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

- <what must stay true while this run is built — from the spec's Out of scope, the `D-n`
  decisions in `decisions.md`, and `_shared/project-rules.md`>

## Context budget

- <what was loaded beyond the stage's Inputs, and why — the stage's overrun note lives here>
