# Project: event-holds-capacity

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-flow/event-holds-capacity.md
- scope: none — the quote-flow epic was re-cut by `/project` (2026-09-18) with no front run; the breakdown is `intake/quote-flow/breakdown.md`
- spec: 02_define/output/spec.md
- touches: web/src/lib/bookings.ts, web/src/lib/availability.ts, web/src/lib/quotes.ts, web/src/lib/quote-checkout.ts, web/src/lib/quote-refund.ts, web/src/lib/quote-builder.ts, web/src/app/api/stripe/webhook/route.ts, web/src/app/admin/calendar/page.tsx, web/src/components/admin/availability-calendar.tsx, web/src/app/admin/sales/actions.ts, web/src/components/admin/lead-quote-card.tsx
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- Whole-day hold only (the client's answer, D-1 in `decisions.md`); no slot or vehicle columns on `quotes`.
- The hold is derived from quote status; nothing writes to `availability`; no migration (D-2).
- No admin override on a held day (D-2); clashes are flagged, never auto-resolved (D-3).
- Public pages never reveal an event — `availability.note` discipline.
- One definition each of "live booking" (`holdsCapacity`/`holdsCapacitySql`) and "holding quote".
- Rendering is ISR: revalidate `/reservar` on a hold flip; nothing per-request on public pages (`/AGENTS.md` § Conventions).

## Context budget

- Define read beyond its Inputs: targeted reads of `web/src/lib/bookings.ts`, `web/src/lib/availability.ts`, the `availability`/`quotes` schema, `quote-refund.ts` and the calendar page, to name `touches:` and settle the hold shape.
