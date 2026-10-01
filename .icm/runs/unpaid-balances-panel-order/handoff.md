# Handoff: unpaid-balances-panel-order

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once **Spec approved** is ticked on https://github.com/k0d0minio/agorasim/pull/163, run
   `/pipeline build unpaid-balances-panel-order` and execute `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** in the body of
  https://github.com/k0d0minio/agorasim/pull/163.

## Do not

- Tick either gate box; start Build before the tick.
- Change the balance eligibility rule or `isBalanceFlagged` — that is
  `balance-scheduler-hardening/one-open-instalment-rule`'s territory.
- Touch `balance-request-not-on-event-day` files (`balance-schedule.ts` window logic) — another
  stub in the same epic, not yet opened.
