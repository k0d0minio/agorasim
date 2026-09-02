# Stub: The cancel link — public route, 48h gate, refund, confirmation

- feature-slug: cancel-route-flow
- epic: cancellation-selfserve
- priority: P1
- size: M
- depends-on: cancellation-token-schema
- sequence: 2 of 4
- sources: D7; info PDF §1.4 ("free cancellation up to 48h — correct"); copy sites: `web/src/content/booking.ts:113-116`, `content/experiences.ts:119-120`, `content/emails.ts:88-95`

## Problem

The promise has no mechanism: guests can only reply to the email or call. Decided
shape (D7): a signed link in the confirmation email; outside 48h it cancels with a
full refund — **default: automatically** (the client has been asked whether the team
should confirm first; build the default, keep the switch cheap); inside 48h it blocks
with a contact prompt (phones + WhatsApp), per the promise's own wording.

## Proposed change

A public `/[locale]/reserva/cancelar/[token]`-style route (PT/EN): shows the booking
summary (no PII beyond what the token unlocks), computes the 48h boundary against the
tour's departure slot time (Europe/Lisbon), confirms intent ("Keep booking" default,
HIG-style), then cancels: Stripe refund (full, minus nothing — "free"), fee returned
pro-rata via the refund-machinery substrate, seats freed, guest + team emails sent.
Idempotent and rate-limited; a spent/unknown token gets a neutral page. Confirmation
email gains the link.

## Acceptance criteria (rough)

- [ ] Link outside 48h: booking refunded + seats freed + both emails, one confirm step
- [ ] Inside 48h: no cancellation; contact prompt with phones/WhatsApp
- [ ] Token single-use; unknown/spent tokens leak nothing; route rate-limited
- [ ] PT/EN complete; CI green

## Prompt

In the agorasim repo (`web/`), build the guest self-serve cancellation route per
`.icm/intake/cancellation-selfserve/cancel-route-flow.md`. Depends on the token
schema stub (same epic) and the refund substrate
(`.icm/intake/commission-engine/refund-machinery.md`) being merged — verify both on
main before starting. Bilingual route + content module additions (keep PT/EN in
sync), 48h computed against slot departure time Europe/Lisbon, confirm-before-cancel,
full Stripe refund with proportional fee return, seat release via the occupancy
exclusion, rate limiting per `web/src/lib/rate-limit.ts` patterns, and the link added
to the confirmation email in `web/src/lib/booking-emails.ts`. PR on a `claude/`
branch; no local checks — CI is the source of truth.
