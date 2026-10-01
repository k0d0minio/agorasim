# Build notes: balance-request-not-on-event-day

- commits: 616f23e feat: balance-request-not-on-event-day — no balance email on the event day · 4f3fd1a chore: … — ready
- ci: GREEN on 4f3fd1a (full gate — Vercel pass; Quality (advisory) pass)
- ready: 2026-10-01T10:57:13Z — flipped on 616f23e

## What changed

- `web/src/lib/balance-schedule.ts`: `isRequestInWindow` → `daysBetween(today, eventDate) >= 1`;
  `isReminderDue` returns false unless `1 <= daysLeft <= 7`; module and function docs say T−1 is
  the last morning either email can go out.
- `web/src/lib/quotes.ts`: `listQuotesDueForBalance` and `listQuotesForBalanceReminder` floor
  `event_date` at `shiftDays(today, 1)`; docblocks name the same edge as the predicates.
- `web/src/lib/cron/balance-scheduler.ts`: header and `requestPass` comments only — no logic.
- `web/src/lib/balance-schedule.test.ts`: the old "asks up to and on the event day" case split
  into T−1 → true and event day → false; reminder cases for T−1 (due) and event day (not due).
- `web/src/lib/cron/balance-scheduler.test.ts`: the fake reminder query's floor moved to
  `today + 1` (mirrors the real query); the fake due query stays floorless so the job's own
  `isRequestInWindow` guard is what the event-morning case exercises. New cases: request at T−1
  sent; request on the event morning not sent, nothing claimed or minted, original digest kept;
  reminder at T−1 (request at T−4) sent; reminder on the event morning (request at T−3) not sent,
  the request's digest kept.

## Acceptance criteria status

- [x] T−14 request never on the event day; still at T−1 — predicate + query floor; cron tests
- [x] T−7 reminder never on the event day; still at T−1 — predicate + query floor; cron tests
- [x] Both queries floor at `today + 1`, agreeing with both predicates
- [x] `balance-schedule.test.ts` covers event day → false, T−1 → true for both predicates
- [x] `cron/balance-scheduler.test.ts` covers the event morning (nothing sent, link unchanged)
      and T−1 (sent)
- [x] "Saldo por pagar" panel and quote-card badge unchanged — `isBalanceFlagged` and
      `listUnpaidBalancesDue` not touched
- [x] CI green — full gate on 4f3fd1a: Vercel pass, Quality (advisory) pass

## Notes for Release

- No schema, env or UI change; the preview has nothing visible to smoke for this run — the
  behaviour is the 06:00 job's, proven by the unit and job tests in the advisory quality job.
- `security-check.sh --branch` is `BLOCKED 1` on a dependency audit that is not this branch's:
  4 high/critical advisories already on `main` (`next` 16.3.4 — a critical RCE in `next/og`,
  patched in 16.3.6 — and `undici` via `shadcn` and `@vercel/blob`). The branch changes no
  manifest or lockfile, and the diff's own secrets scan is clean. Parked as
  `.icm/intake/triage/dependency-advisories-next-undici.md` (chore, P1) per the
  security-audit skill's Dependency findings rule.
