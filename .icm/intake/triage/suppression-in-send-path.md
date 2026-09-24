# Stub: Enforce the opt-out list inside sendLoggedEmail, not by each sender's memory

- lane: chore
- found-by: thankyou-review-email (Release code review, high) · 2026-09-24
- complexity: low

## Problem

The thank-you job checks `isOptedOut` before `sendLoggedEmail`; the module note in
`web/src/lib/email-opt-out.ts` says every future marketing-basis sender must do the same.
Nothing enforces it: the next non-booking sender that calls `sendLoggedEmail` directly would
mail opted-out addresses, breaking the objection the privacy policy promises to honour.

## Proposed change

A `MARKETING_KINDS` set in `web/src/lib/message-log.ts` (today `thank-you-review`) and a check
inside `sendLoggedEmail`, before the claim, returning a `skipped` / `opted-out` outcome for an
opted-out recipient; the job keeps its count from that outcome.

## Prompt

In the agorasim repo, read `.icm/intake/triage/suppression-in-send-path.md`. Move the opt-out
check for marketing-basis kinds into `sendLoggedEmail` (`web/src/lib/message-log.ts`) before
the claim, keep `web/src/lib/cron/thank-you-review.ts`'s `opted out` count, and test both.
`git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
