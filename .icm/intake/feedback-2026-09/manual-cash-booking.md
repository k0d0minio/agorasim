# Stub: Manual bookings with a cash deal — the phone sale takes its car too

- feature-slug: manual-cash-booking
- epic: feedback-2026-09
- priority: P1
- size: L
- depends-on: calendar-airbnb-grid
- sequence: 2 of 3
- sources: Diogo & Rita's feedback relayed by Jamie, 2026-09-07 ("accept cash
  bookings without double booking on the website");
  `web/src/lib/booking-checkout.ts:205` (the only `insert(bookings)` in the repo);
  `web/src/lib/bookings.ts` (`countSlotOccupancy`, `holdsCapacity`);
  `web/src/lib/fleet.ts` (`assignVehicle`, `slotFitsParty`)

## Problem

Every `bookings` row is born inside Stripe checkout — there is no other insert. A
tour sold over the phone or WhatsApp and paid in cash exists only in Diogo's head:
its driver and its car are really committed, but `countSlotOccupancy` cannot count a
row that was never written, so the website keeps selling that departure. The current
workaround — closing the whole slot — throws away the *other* driver's capacity. The
inverse risk is live too: while the cash sale is unrecorded, a web checkout can take
the last car and now the cash guest has no vehicle.

## Proposed change

- **A payment-method column on `bookings`** (`payment_method: 'stripe' | 'cash'`,
  existing rows backfilled `stripe`), so the money view and refund paths can tell a
  Stripe row (has a payment intent) from a cash row (doesn't) without inferring from
  null Stripe columns.
- **A "Nova reserva" server action** (`requireAdmin()` first): tour, date + departure,
  party in the price bands (adults/children/infants), guest name + contact, payment
  method. It re-uses the same server-side arithmetic checkout uses —
  `slotOccupancyOn` + `assignVehicle`/`slotFitsParty` — and refuses a departure with
  no driver or no fitting vehicle free. The price is computed from the catalogue like
  checkout's, with an editable amount for the negotiated cash deal (the
  `priceBreakdown` snapshot records what was actually agreed). Inserted `confirmed`
  immediately — no hold, no Stripe session — so it holds capacity from the first
  render of either calendar.
- **Entry point**: the redesigned calendar day sheet (previous stub) offers "Nova
  reserva" on an open departure; a second entry from the Sales board is welcome but
  not required.
- **Sales board visibility**: create the minimal `tour_requests` row alongside, so
  the guest shows up on the board like any other booking rather than being invisible
  demand (mark its source so attribution work isn't polluted — see
  `admin-answers/lead-source-attribution.md`).

Out of scope: deposits/instalments and event quotes (`quote-flow/`), refunds of cash
rows beyond what the status enum already expresses, and any invoicing/tax artefact.

## Acceptance criteria (rough)

- [ ] A cash booking recorded in the admin consumes a driver + vehicle: the admin
      calendar shows it and `/reservar` refuses the departure when it's the last slot
- [ ] The form refuses an over-capacity departure with a Portuguese error naming why
- [ ] Cash row: `confirmed`, `payment_method = 'cash'`, no Stripe ids, honest
      `priceBreakdown`; appears on the Sales board
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add manual booking creation with a cash payment
method per `.icm/intake/feedback-2026-09/manual-cash-booking.md` — read that stub
first. Schema: add `payment_method` (`stripe`/`cash`) to `bookings`
(`web/src/db/schema.ts`), backfilling `stripe`. Server: an admin action guarded by
`requireAdmin()` that validates capacity with `slotOccupancyOn`
(`web/src/lib/bookings.ts`) and `assignVehicle`/`slotFitsParty`
(`web/src/lib/fleet.ts`), computes the catalogue price with an editable cash-deal
amount, snapshots `priceBreakdown`, and inserts a `confirmed` booking plus a minimal
`tour_requests` row for the Sales board. UI: "Nova reserva" from the admin calendar
day sheet (built in the same epic's calendar-airbnb-grid stub), phone-first per
`web/docs/admin-mobile-design-spec.md`, strings in Portuguese (D4 in
`.icm/project.md`). Watch `holdExpiresAt` being NOT NULL on a row that never holds.
PR on a `claude/` branch; no local checks — CI is the source of truth.
