# Stub: "Saldo por pagar" puts the nearest events first, whatever piles up in the past

- feature-slug: unpaid-balances-panel-order
- scope: balance-scheduler-hardening
- personas: team, operator
- initiative: contracted feature ⑥ hardening / objective: the T−14 balance scheduler and the Sales board's unpaid-balances read agree on what is still open and when
- priority: P3
- complexity: low
- depends-on: none
- sequence: 2 of 3

## Problem

`listUnpaidBalancesDue` (`web/src/lib/quotes.ts`) has no lower date bound, sorts by event
date ascending and stops at 50 rows. Past events whose balance nobody recorded or wrote
off stay on the list for good, which is deliberate: nothing auto-releases until the client
decides the T−0 rule. Once 50 of them pile up, the upcoming events inside T−3, which are
the ones the panel exists for, fall off the end. Unlikely at today's volume, but invisible
when it happens.

## Proposed change

Order the upcoming events (`event_date >= today`) first, soonest first, then the past
ones, most recent first. Alternatively, read the two sets separately and render the past
ones under their own "Eventos passados" line. Keep the rule `isBalanceFlagged` states.

## Acceptance criteria (rough)

- [ ] A past unresolved balance can no longer push a soon-due (inside T−3) balance off the
      50-row list
- [ ] Past events remain visible on the panel (nothing is hidden, only reordered or
      separated)
- [ ] A test seeds more than 50 rows spanning past and future and asserts the soon-due ones
      survive; CI green

## Out of scope (this feature)

- Any T−0 auto-release rule for event-day balances — still the team's decision, unchanged
  by this stub.

## Notes for Define

- `sources:` balance-scheduler / Release code review · 2026-09-25 —
  `web/src/lib/quotes.ts` (`listUnpaidBalancesDue`).
- `touches:` web/src/lib/quotes.ts

## Prompt

In the agorasim repo, read
`.icm/intake/balance-scheduler-hardening/unpaid-balances-panel-order.md`. Reorder (or
split) `listUnpaidBalancesDue` as described so a past pile-up can't crowd out soon-due
balances, keeping `isBalanceFlagged`'s rule; test it. `git mv` this stub to `_done/` in the
PR, on a `claude/` branch; CI is the source of truth.
