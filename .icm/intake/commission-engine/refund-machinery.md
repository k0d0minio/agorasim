# Stub: Refund machinery — `refunded` gets a write path, fees return pro-rata, seats free up

- feature-slug: refund-machinery
- epic: commission-engine
- priority: P1
- size: M
- depends-on: tour-application-fees
- sequence: 3 of 3
- sources: agreement §6 ("Refunds return commission… in proportion"); 2026-08-29 data lens: webhook handles only `checkout.session.*` (`web/src/app/api/stripe/webhook/route.ts:34-45`), nothing ever writes `refunded`, `occupiesSeatSql` keeps counting refunded bookings (`web/src/lib/bookings.ts:116-131`), no refund columns

## Problem

A refund issued in the Stripe dashboard today leaves the booking `confirmed`: the
departure still counts the party (can show sold out for a refunded tour), the books
never say `refunded`, and no application fee would be returned. The agreement requires
commission refunded in proportion to any refund.

## Proposed change

Handle `charge.refunded` / `refund.updated` in the webhook: write `refunded` (or a
partial-refund representation) with refunded-amount and refund-id columns, release the
seats/vehicle by excluding refunded bookings from occupancy, and refund the
application fee proportionally (`refund_application_fee` or explicit fee refund),
recording what was returned. Admin booking detail shows refund state. This is the
substrate the cancellation-selfserve epic triggers.

## Already landed (cancellation-selfserve/admin-cancel-refund)

The admin cancel-and-refund action needed part of this substrate to be honest, so
it shipped with it: `bookings` gained `refunded_amount_cents`, `stripe_refund_id`
and `refunded_at` (migration `0017_refund_amounts`), `lib/booking-refund.ts` writes
`refunded`/`cancelled` with the amount and asks Stripe to return an application fee
proportionally when the charge carries one, and the admin booking detail shows
refund state. Seats needed nothing: `holdsCapacitySql` already counts only
`confirmed` and live `pending` rows, so the status write *is* the release — the
`occupiesSeatSql` line in the sources below predates shared capacity pools.

`cancellation-selfserve/cancel-route-flow` then landed the guest's own cancel
link on that same engine rather than a second one: it resolves the token, gates
on the 48-hour policy, and calls `cancelAndRefundBooking({ via: "guest" })` for
the full amount. So both paths that end a paid booking already share one write,
one email and one audit shape — the webhook below is the third caller, and the
only one that has to reconcile a refund it did not initiate.

**What is left here:** the webhook path (`charge.refunded` / `refund.updated`), so a
refund issued in the Stripe dashboard reaches the same columns idempotently, and the
fee arithmetic for the fees `tour-application-fees` will start taking.

## Acceptance criteria (rough)

- [ ] Dashboard-issued sandbox refund → booking shows refunded, seats freed
- [ ] Partial refund represented honestly (amounts, not just a status)
- [ ] Application fee returned pro-rata and recorded
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), give refunds a write path per
`.icm/intake/commission-engine/refund-machinery.md`: extend
`web/src/app/api/stripe/webhook/route.ts` to handle `charge.refunded`/`refund.updated`
idempotently, add refund columns to `bookings` via migration, exclude refunded
bookings from `occupiesSeatSql` in `web/src/lib/bookings.ts`, refund the application
fee proportionally when one was taken, and surface refund state on the admin sales
booking detail. Test the webhook paths as the existing webhook tests do. PR on a
`claude/` branch; no local checks — CI is the source of truth.
