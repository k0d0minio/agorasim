# Project: guest-calendar-polish

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/open-calendar/guest-calendar-polish.md
- scope: .icm/runs/open-calendar/01_scope/output/scope.md
- spec: 02_define/output/spec.md
- touches: web/src/components/booking-date-picker.tsx, web/src/components/booking-checkout-form.tsx, web/src/components/tour-request-form.tsx, web/src/content/tour-request.ts, web/src/content/logistics.ts
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- `departureUsable` / `slotFitsParty` stay the single rule for "can this party take this
  departure" — the picker must keep offering exactly what `checkSlotAvailable` accepts.
- The guest is never told why a day is unavailable; nothing new enters the public payload.
- No change to checkout, payment, or the enquiry form's fields or server rules.
- /reservar stays ISR (`revalidate = 3600`): no per-request work on the page; the date check
  runs in the browser.
- PT and EN in sync for every string (`/AGENTS.md` § Conventions).
- D-2 six-month window, D-3 two days' notice, D-10 the Airbnb-style finish (`decisions.md`).

## Context budget

- Define read `booking-date-picker.tsx`, parts of `booking-checkout-form.tsx`,
  `tour-request-form.tsx`, `lib/availability.ts` and `content/logistics.ts` to settle the
  summary format (Óbidos has no clock time) and confirm `todayKey` is server-only.
