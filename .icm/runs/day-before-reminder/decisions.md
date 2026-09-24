# Decisions: day-before-reminder

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- No `scope.md` for this epic (re-cut by `/project` 2026-09-18). Register decisions the run
  rests on: D5 (email-first, SMS post-live), D24 (the reminder is contract performance — no
  opt-in, no opt-out line).

## Made in this run

- D-1 — Late bookings and moves into tomorrow after the 06:00 run get a same-morning catch-up
  ("today" variant, same log key) instead of the stub's "no reminder" default. Operator, Define,
  2026-09-24.
- D-2 — Óbidos reminder adds "if you haven't had the exact departure time from us yet, call or
  message Diogo or Rita" with both numbers. Operator, Define, 2026-09-24.
- D-3 — No money line (cash and Stripe read the same) and no cancellation link (48h window
  closed). Operator (money), Define (cancel link, from `cancellation-window.ts`), 2026-09-24.
- D-4 — The privacy policy's transactional-email lists name the reminder in the same PR.
  Define, 2026-09-24.
