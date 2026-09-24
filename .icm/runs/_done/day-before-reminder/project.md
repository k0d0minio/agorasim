# Project: day-before-reminder

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/lifecycle-messages/day-before-reminder.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/bookings.ts, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/lib/cron, web/src/app/api/cron/dispatch/route.ts, web/src/content/privacy.ts
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- Contract performance (D24): no opt-in, no opt-out line. Email only (D5).
- One `day-before-reminder` kind keyed on `(booking, booking.date)` — both variants share it.
- No money line, no cancellation link; PT copy gender-neutral; copy lives in `content/emails.ts`.
- No second cron, no schedule change, no schema change, no team copy.
- Base branch is `uat`; the PR targets `uat`.

## Context budget

- Define read the §2.6 copy from `.icm/docs/agorasim-info.pdf` and targeted slices of `web/src/lib/{bookings,booking-checkout,message-log,manual-booking}.ts`, `web/src/lib/cron/`, `web/src/content/{logistics,emails,privacy}.ts` to fix `touches:` and the edge cases.
