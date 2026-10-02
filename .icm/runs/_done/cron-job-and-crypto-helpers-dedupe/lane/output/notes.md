# Chore: cron-job-and-crypto-helpers-dedupe

- invariant: behaviour unchanged; the dispatcher jobs' summaries, log lines and error-tracker tags are identical, and every token/hash is byte-identical. Only where the shared helpers live differs.
- change: `web/src/lib/crypto-encoding.ts` (new): base64url encode/decode and hex helpers, replacing the copies in `admin-session.ts`, `cancellation-token.ts`, `quote-token.ts`, `email-opt-out-token.ts`.
- change: `web/src/lib/normalize-email.ts` (new, DB-free): `normalizeEmail`, imported by `admin-users.ts` (still re-exported there) and `email-opt-out-token.ts` (drops its `normaliseAddress` copy, which had no other users) — one normalisation, so opt-out hashes cannot drift from it.
- change: `web/src/lib/cron/dispatch-helpers.ts` (new): `catalogueTitleOf()` and `runSealedPass()`, replacing the duplicated catalogue→title map and sealed `runPass` in `day-before-reminder.ts` and `thank-you-review.ts`. `shiftDays`/`shiftDateKey` deliberately untouched (owned by `booking-logistics-facts-shared`); the tally switch stays per job, since the tallies differ.
- rollback: revert the PR; no schema or data change.
- learned: none
