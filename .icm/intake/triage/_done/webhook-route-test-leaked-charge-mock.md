# Stub: `route.test.ts` refund tests red on `main` since #181 — a queued charge mock leaks between tests

- lane: bug
- found-by: release refund-paths-dedupe · Quality (advisory) · 2026-10-05
- complexity: low
- priority: P1

## Problem

Five tests in `web/src/app/api/stripe/webhook/route.test.ts` fail on `main` since
`fix-refund-webhook-stale-charge-snapshot` (#181, merged with its own Quality (advisory) red on
63d857e): "acknowledges a charge.refunded whose charge cannot be read" (line 543), the three
`refund.updated` cases (569, 600, 616) and "asks Stripe to try again when the database is the
thing that failed" (659). Each reads the response one test behind: `ignored: "no charge"` where
`synced` is expected, `unknown-charge` where `no charge` is.

Likely cause: `post()` queues `chargesRetrieve.mockResolvedValueOnce(...)` for every
`charge.refunded` event, but the "foreign account" `charge.refunded` test is dropped by the
route before the charge is read, so its queued value is never consumed. `vi.clearAllMocks()` in
`beforeEach` clears calls, not queued once-implementations (Vitest 4), so the leftover answers
the next test's `charges.retrieve` and every later refund test is off by one.

## Proposed change

In `beforeEach`, reset the queue — `chargesRetrieve.mockReset()` (or `vi.resetAllMocks()` if the
suite tolerates it) — and confirm the five go green with no production change; if they don't,
read the route's `chargeBehind` against the test fixtures.
