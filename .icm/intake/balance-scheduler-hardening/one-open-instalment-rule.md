# Stub: One definition of "an instalment with money still to collect"

- feature-slug: one-open-instalment-rule
- scope: balance-scheduler-hardening
- personas: team
- initiative: contracted feature ⑥ hardening / objective: the T−14 balance scheduler and the Sales board's unpaid-balances read agree on what is still open and when
- complexity: low
- depends-on: none
- sequence: 3 of 3

## Problem

`isBalanceOpen` (`web/src/lib/balance-schedule.ts`) is a copy of the private
`isOpenInstalment` in `web/src/lib/quotes.ts`: `pending` or `issued`, and more than zero.
The quote page (`dueInstalment`) reads one copy, and the scheduler, the Sales panel and the
quote-card badge read the other. A new payment status added to one copy would make the
page and the panel disagree about whether a balance is open.

## Proposed change

Move the predicate into `web/src/lib/quote-math.ts`, which has no runtime imports and is
safe from both modules, with a type-only import of `QuotePayment`. `quotes.ts` and
`balance-schedule.ts` then both import it. No behaviour change.

## Acceptance criteria (rough)

- [ ] `isOpenInstalment` moves to `web/src/lib/quote-math.ts` as the one definition
- [ ] `quotes.ts` and `balance-schedule.ts` both import it; no second copy remains
- [ ] No behaviour change — every existing test across the quote page, scheduler, Sales
      panel and quote-card badge stays green unchanged

## Out of scope (this feature)

- The two behaviour fixes ahead of it in this epic's build order — this stub only unifies
  the predicate those fixes already read.

## Notes for Define

- Sequenced last in this epic: moving the predicate before the two behaviour fixes land
  would mean rebasing the move over both of them.
- `sources:` balance-scheduler / Release code review · 2026-09-25 —
  `web/src/lib/balance-schedule.ts` (`isBalanceOpen`), `web/src/lib/quotes.ts`
  (`isOpenInstalment`).
- `touches:` web/src/lib/balance-schedule.ts, web/src/lib/quotes.ts,
  web/src/lib/quote-math.ts

## Prompt

In the agorasim repo, read
`.icm/intake/balance-scheduler-hardening/one-open-instalment-rule.md`. Move the predicate
to `web/src/lib/quote-math.ts` as described, with no behaviour change. `git mv` this stub
to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
