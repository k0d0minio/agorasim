# Chore: suppression-in-send-path

- invariant: behaviour unchanged — the thank-you still skips opted-out addresses, claims nothing for them and counts them as "opted out"; only where the check lives differs.
- change: web/src/lib/message-log.ts: `MARKETING_KINDS` (today `thank-you-review`) and a suppression check in `sendLoggedEmail` before the claim, returning `skipped` / `opted-out`; fails closed (`failed`) when the list cannot be read; a `ClaimedMessage` is checked once built and its claim released. web/src/lib/cron/thank-you-review.ts: drops its own `isAddressHashOptedOut` call and counts `opted-out` from the outcome. Tests: message-log.test.ts (5 new), thank-you-review.test.ts (mock moved into the log fake).
- rollback: revert the commit; the job's own pre-check returns with it. No schema or data change.
- learned: none
