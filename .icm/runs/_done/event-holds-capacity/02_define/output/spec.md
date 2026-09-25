# Spec: A deposit-paid event closes its whole day to tours

- slug: event-holds-capacity
- personas: team, guest
- touches: web/src/lib/bookings.ts, web/src/lib/availability.ts, web/src/lib/quotes.ts, web/src/lib/quote-checkout.ts, web/src/lib/quote-refund.ts, web/src/lib/quote-builder.ts, web/src/app/api/stripe/webhook/route.ts, web/src/app/admin/calendar/page.tsx, web/src/components/admin/availability-calendar.tsx, web/src/app/admin/sales/actions.ts, web/src/components/admin/lead-quote-card.tsx
- complexity: standard

## Problem

Weddings and events are the 6% side of the business (contracted feature ⑥), and the deposit
exists "to hold the date" (proposal §5). Today a quote only holds the date in its terms. The
occupancy count that the Calendar, the public `/reservar` calendar and every checkout re-check
share (`countSlotOccupancy`, `web/src/lib/bookings.ts`) reads `bookings` only, so a
Saturday wedding with Diogo in the 4L still sells both tour departures that day. With capacity
at 2 drivers across 4 cars, the family would be double-booked. This spec closes the last step
of the quote flow: the objective "the deposit holds the date" is true on the Calendar and on
public availability.

## Proposed change

**The client's rule (answered 2026-09-25, recorded by Jamie in this session): a deposit-paid
wedding or event takes the whole day.** Both departures of the event's date (10:00 and 14:00)
come out of the pool.

- **The hold is derived from the quote's status and never stored.** A quote *holds* its
  `event_date` while its status is `deposit_paid` or `paid`. That includes a deposit the team
  wrote off as paid by bank transfer, which already moves the quote to `deposit_paid`
  (`statusAfterPayment`). The hold ends when the quote becomes `cancelled`: a refund whose
  dialog calls the event off, "Cancelar evento" on a fully refunded quote, or any other path
  to `cancelled`. Nothing is written to the `availability` table, so there is no migration and
  no second record to reopen on release, and a date Rita closed or never opened keeps its own
  state afterwards.
- **One chokepoint.** Held quotes are added to the shared occupancy count as a whole-day hold
  on both departures, so every reader that already goes through it refuses the day with no
  per-caller logic: the public calendar, the checkout re-check (`checkSlotAvailable`), the
  enquiry form's day check (`checkDayBookable`), the admin's manual booking ("Nova reserva"),
  booking moves and the departure window. The occupancy result carries the hold as its own fact
  (which quote, which kind), separate from bookings, so the admin can say *why* a day is full.
- **No override.** An event day can't be sold or moved into from the admin while the quote
  holds it. Freeing the day means cancelling the event.
- **The guest sees an unavailable day and nothing more.** Public pages never say a wedding is
  on (same rule as `availability.note`).
- **Freshness.** `/reservar` is ISR (hourly). When a quote starts or stops holding (the deposit
  recorded by the webhook or the return reconciler, a transfer write-off, a cancellation), the
  public booking pages are revalidated so the day disappears or reappears at once, not within
  the hour. The checkout re-check is dynamic and authoritative whatever the cache shows.
- **Calendar (admin).** A held day reads as taken by an event in the month grid, not as an
  ordinary full departure. Its day sheet lists the event above the tours with: the kind
  (Casamento / Evento, from the enquiry's `enquiry_kind`), the couple's or client's name (none
  if the enquiry was erased), the venue, "Dia inteiro", the quote reference, and a link to the
  lead's Sales page.
- **Clash marker.** A deposit can land on a day that already has live tour bookings, because
  the guest pays through Stripe and can't be refused. Those bookings stay as they are. The day
  sheet marks the clash ("Conflito: N reservas neste dia") on the event entry, and Rita resolves
  it by hand.
- **Builder warning.** In the quote builder on the lead's page (`lead-quote-card`), when the
  quote's event date already has live tour bookings, a warning names how many and on which
  departures. It appears on the draft and again at "Enviar". It warns and never blocks sending.
  "Live" is the same predicate the occupancy uses: confirmed, or pending with an unexpired
  hold.
- Admin wording follows `.icm/docs/admin-pt-inventory.md` (*orçamento*, *evento*, *reserva*).

## Acceptance criteria

- [ ] When a quote's deposit is recorded as paid (Stripe webhook or return reconciler), both departures on its event date become unbookable on the public `/reservar` calendar, and a checkout submitted for either departure that day is refused as unavailable
- [ ] A deposit written off as paid by bank transfer holds the day the same way as a Stripe payment
- [ ] A quote at `paid` (balance settled) still holds its day; a quote at `draft` or `sent` holds nothing
- [ ] When the quote becomes `cancelled` (a refund that calls the event off, or "Cancelar evento"), the day's departures return to whatever the availability rows and bookings alone say: open if Rita had opened them, closed or absent otherwise
- [ ] Nothing is written to the `availability` table by a hold or a release, and there is no schema migration
- [ ] The public booking pages are revalidated when a quote starts or stops holding, so the change is visible without waiting for the hourly ISR window
- [ ] The enquiry form's day check, the admin's manual booking and a booking move into a held day are all refused, through the shared occupancy count rather than per-caller checks
- [ ] The admin Calendar shows a held day as taken by an event, and its day sheet lists the event with kind, name (none after erasure), venue, "Dia inteiro", quote reference and a link to the lead
- [ ] When a held day also has live tour bookings, the day sheet shows a clash marker with the number of bookings; the bookings themselves are untouched
- [ ] The quote builder shows a warning (count and departures) when the quote's event date has live tour bookings, on the draft and at send; sending still works
- [ ] No public page or payload reveals that an event is on a date; the guest sees only an unavailable day
- [ ] Unit tests cover hold and release in the occupancy count (deposit_paid, paid, transfer write-off, cancelled, draft/sent), the checkout re-check refusing a held day, and the builder's clash count; CI green

## Out of scope

- Partial-day or per-car holds (one departure, N specific cars) — the client answered "whole day"; a vehicle or slot column on the quote is not added.
- Whether the enquiry's `preferredCar` becomes the quote's vehicle — moot under a whole-day hold (the stub's open point, closed here).
- Multi-day events; events without a paid deposit (a sent quote holds nothing).
- An admin override that sells a tour on an event day while the quote holds it.
- Warning about, or preventing, two deposit-held events on the same date.
- Emailing the team when a deposit lands on a clashing day (the day-sheet marker and the builder warning are the chosen signals).
- Automatically cancelling, moving or refunding tour bookings that clash with an event.

## Open questions

- none — the client's rule (whole day), the hold shape (derived, no override) and the clash
  handling (day-sheet marker + builder warning) were settled with Jamie in the Define session
  on 2026-09-25. The register's open question should be closed by the next `/project agorasim`
  run.
