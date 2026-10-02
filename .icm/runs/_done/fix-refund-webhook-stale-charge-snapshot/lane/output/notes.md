# Bug: fix-refund-webhook-stale-charge-snapshot

- observed: a delayed `charge.refunded` carrying a lower `amount_refunded` than a later refund already recorded made both reconcilers follow Stripe "down" and leave the row below the real total · expected: the row stays at Stripe's current figure
- cause: `chargeBehind` (web/src/app/api/stripe/webhook/route.ts) reconciled `charge.refunded` from the event's own `data.object` snapshot; only `refund.updated` re-read the charge
- fix: web/src/app/api/stripe/webhook/route.ts: `chargeBehind` now retrieves the charge on its owning account for `charge.refunded` too; tests added in route.test.ts (stale snapshot → row unchanged; unreadable charge → acknowledged) and the two `post` helpers queue the retrieve
- changelog: not user-visible
- learned: none
