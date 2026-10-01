# Failures: refund-idempotency-cached-declines

The run's retrospective — what cost a turn, and the rule that would have prevented it. Two
files share this job and split it cleanly: `error.log` (in the stage's `output/`) is the ledger
of errors a **tool** reported, written verbatim at the moment of the fix with its `- resolved:`
and `- rule:` lines, which `retrospective.sh` reads and counts across runs; **this file** is
what the run as a whole learned — a wrong assumption, a STOP, a skipped step, a gate that
blocked, a plan that had to be rewritten — which no tool ever logged. On close-out the
`## Learned rules` bullets below are copied into `_shared/project-rules.md` → Learned rules
(`run-pack.sh <slug> --sync-rules`, called by `close-out.sh`, the same shape as
`retrospective.sh --apply`), so the next run in this repo starts with them. Keep the rules
general; keep the retrospectives specific; never restate an `error.log` entry here.

## Retrospectives

### 2026-10-01 — a new guard on the claimed row broke a suite outside `touches:`

- what happened: Build read only the spec's `touches:` files; `claimedAt()` refused a claimed booking with no `cancelledAt`, and `src/app/admin/actions.test.ts` — which drives `cancelAndRefundBooking` through `cancelBooking` — faked exactly that row. Quality (advisory) went red on the ready head.
- why: Define listed the module's direct test file but not the action-level suite that exercises the same function through the Sales action.
- fixed by: 30aa426 — the suite's claim fixtures carry `cancelledAt`.

### 2026-10-01 — Release code review found a replay that settled twice

- what happened: `/code-review` showed that a replayed `attemptId` whose charge could not be read back would add the refund to the row a second time (the row-plus-refund fallback).
- why: the spec reasoned about the replay only with the charge readable; the fallback path for an unreadable charge predates the per-attempt key and assumed a key could never be replayed against a moved row.
- fixed by: b22a46c — a refund Stripe hands back that the row already records (`stripeRefundId`) returns as refunded without settling.

## Learned rules

- A test that fakes `cancelAndRefundBooking`'s claim — `web/src/app/admin/actions.test.ts` included — must return a row with `cancelledAt` set: the tour refund's idempotency key is read from it (`claimedAt` in `web/src/lib/booking-refund.ts`).
- Before a spec changes what a Stripe call is keyed on, grep the repo's tests for every caller of that function (action suites, webhook route tests) and list them in `touches:` — not only the module's own test file.
