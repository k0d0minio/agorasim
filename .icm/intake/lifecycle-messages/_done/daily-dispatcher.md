# Stub: One daily dispatcher — the clock every scheduled message rides

- feature-slug: daily-dispatcher
- epic: lifecycle-messages
- priority: P1
- size: M
- depends-on: message-log-schema
- sequence: 2 of 6
- sources: 2026-08-29 data lens: only cron is retention, weekly (`web/vercel.json:3-8`); day-before reminders and quote T−14 both need daily execution; Vercel plan cron limits unknown (Jamie question — build the fan-out shape that works on any plan)

## Problem

A weekly cron cannot send a "tomorrow is the big day" email. Rather than one cron per
message kind (plan-limited), one daily dispatcher route should fan out to every due
job.

## Proposed change

A single `/api/cron/dispatch` route (CRON_SECRET-guarded, constant-time, mirroring the
retention route), added to `vercel.json` daily (early morning Europe/Lisbon). It runs
registered jobs in sequence: day-before reminders, thank-you sends, quote balance
issuance/reminders (the quote-flow epic registers its job here). Each job is
idempotent via the message log; a job failure doesn't stop the others; results are
summarised in the audit log with a null actor, like retention does.

## Acceptance criteria (rough)

- [ ] Daily cron live; unauthenticated calls refused
- [ ] Job registry pattern lets later epics add jobs without touching the route
- [ ] Double-run sends nothing twice; partial failure isolates; CI green

## Prompt

In the agorasim repo (`web/`), add the daily dispatcher per
`.icm/intake/lifecycle-messages/daily-dispatcher.md`: an
`/api/cron/dispatch/route.ts` modelled exactly on the security of
`web/src/app/api/cron/retention/route.ts` (bearer CRON_SECRET, constant-time compare,
refuse when unset, audit summary row), a `vercel.json` daily schedule, and a small job
registry (start with a no-op or the reminder job if its stub has merged). Idempotency
comes from the message log (same epic). PR on a `claude/` branch; no local checks —
CI is the source of truth.
