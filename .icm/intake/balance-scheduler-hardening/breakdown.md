# Breakdown: Balance scheduler hardening — the review findings against the T−14 balance path

- scope-slug: balance-scheduler-hardening · story: none — cut from triage/ by triage batch balance-scheduler
- initiative: contracted feature ⑥ hardening / objective: the T−14 balance scheduler and the Sales board's unpaid-balances read agree on what is still open and when
- personas: team, operator, guest

## What I understood

Three findings landed against the balance path from the same review pass
(`balance-scheduler` / Release code review · 2026-09-25): the T−14 request window has no
upper bound and can fire on the morning of the event itself, "an instalment with money
still to collect" is defined twice and could drift, and the unpaid-balances panel has no
lower date bound so a pile-up of unresolved past events could push soon-due ones off the
end. All three read or write `web/src/lib/balance-schedule.ts` and/or
`web/src/lib/quotes.ts`, so they're sequenced as one epic rather than three PRs each
rebasing over the last.

## Where it sits

Money — the T−14 balance request and its chaser: `cron/balance-scheduler.ts` →
`balance-schedule.ts` (`isRequestInWindow`, `isBalanceOpen`) → `quotes.ts`
(`listQuotesDueForBalance`, `listUnpaidBalancesDue`) → the guest's balance email and the
"Saldo por pagar" panel on the Sales board.

## Build order

1. balance-request-not-on-event-day — stop the T−14 request at T−1 so it never fires on the event's own morning — depends-on: none
2. unpaid-balances-panel-order — put the soon-due events first on the "Saldo por pagar" panel so a pile-up of unresolved past ones can't push them off the end — depends-on: none
3. one-open-instalment-rule — move the "instalment still open" predicate to one shared definition, last, once the two behaviour fixes above have settled how it's used — depends-on: none

## Out of scope (whole scope)

- The event-day balance itself becoming an automated rule (T−0) — deliberately left to the
  team's judgement per the approved spec; this batch only stops the guest-facing request,
  not the panel's own visibility of it.
