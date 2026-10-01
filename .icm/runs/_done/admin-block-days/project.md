# Project: admin-block-days

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/open-calendar/admin-block-days.md
- scope: .icm/runs/open-calendar/01_scope/output/scope.md
- spec: 02_define/output/spec.md
- touches: web/src/components/admin/availability-calendar.tsx, web/src/app/admin/calendar/page.tsx, web/src/app/admin/calendar/actions.ts, web/src/lib/form-schemas.ts, web/src/lib/availability.ts
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- D-4: the team can book a blocked departure ("Nova reserva" offers it); keep that.
- D-8: blocking never cancels or hides a booking; the confirm warns and the booking stays.
- D-9: the opening tools go — no sweep, season window, range button or "Limpar" comes back.
- D-11: no recurring blocks.
- Bar actions never post `drivers`/`note`; only "Mais opções" writes them, and never the status.
- 320px one-handed, ≥44px targets, no drag or long-press (admin mobile rules in the component's
  header comment).
- Settled in Define (2026-10-01, Jamie): Airbnb phone gesture; bottom bar + "Ver dia";
  Desbloquear keeps roster and note; every action confirms once.

## Context budget

- Read `availability-calendar.tsx` (~650 of 1773 lines), `admin/calendar/page.tsx` and the
  availability half of `admin/calendar/actions.ts` beyond Define's Inputs, to specify exactly
  what is removed and how the bar fits the existing day sheet.
