# Stub: The two dispatcher jobs and the token modules repeat the same helpers

- lane: chore
- found-by: thankyou-review-email (Release code review, high) · 2026-09-24
- complexity: low

## Problem

`web/src/lib/cron/thank-you-review.ts` repeats `day-before-reminder.ts`'s scaffolding
(`DAY_MS` date shifting, the catalogue → `titleOf` map, the tally switch, the sealed
`runPass`), and each dispatch calls `listCatalogue()` twice. `web/src/lib/email-opt-out-token.ts`
restates `normalizeEmail` (`lib/admin-users.ts`) and the base64url/hex helpers that
`cancellation-token.ts`, `quote-token.ts` and `admin-session.ts` each carry — a normalisation
changed in one copy only would make opt-out hashes stop matching.

## Proposed change

A shared catalogue-title + pass-runner helper under `lib/cron/` (the `shiftDays`/`shiftDateKey`
move into `lib/availability.ts` belongs to `booking-logistics-facts-shared` — one owner, decided
2026-09-26); a DB-free `lib/crypto-encoding.ts` (base64url, hex) and a DB-free
`normalizeEmail` both token modules and `admin-users.ts` import. No behaviour change.

## Prompt

In the agorasim repo, read `.icm/intake/triage/cron-job-and-crypto-helpers-dedupe.md`. Extract
the shared helpers named there without changing behaviour, keep every existing test green, and
`git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
