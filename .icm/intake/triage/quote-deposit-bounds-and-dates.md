# Stub: The quote builder accepts a 100% deposit (a €0 balance row) and an event date in the past

- lane: tweak
- found-by: admin-quote-builder (Release code review) · 2026-09-23

## Problem

`quoteDraftSchema` (`web/src/lib/form-schemas.ts`) allows `depositPercent` 100, which makes
`splitTotal` write a 0-cent `balance` instalment left `pending` — the T−14 job
(`quote-flow/balance-scheduler`) would try to issue a €0 session, and the quote never reaches
`paid`. It also accepts any calendar day, so a past date or one inside T−14 is sent with a
balance "due" before today.

## Proposed change

Decide with Jamie: cap the deposit at 99 or skip the balance row when it is 0; refuse an event
date before today, and warn (not refuse) inside 14 days. Then change the schema and
`validateQuoteInput`.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/quote-deposit-bounds-and-dates.md`, ask
Jamie the two questions in it, implement the answers with tests, and `git mv` this stub to
`_done/` in the PR.
