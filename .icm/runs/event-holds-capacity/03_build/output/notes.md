# Build notes: event-holds-capacity

- commits: feat: event-holds-capacity — a deposit-paid event holds its whole day
- ci: pending — draft head owes nothing; full verdict read after the ready flip (status.md carries it)

## What changed

- `web/src/lib/event-holds.ts` (new): the hold rule in one place — `QUOTE_HOLDING_STATUSES` (`deposit_paid`, `paid`), `quoteHoldsDate`, the pure `applyEventHolds` merge, `eventHoldKeysBetween` (the occupancy's query) and `eventHoldsBetween` (the Calendar's day-sheet read, joined to the lead for kind and name, null after anonymisation). A new module rather than `quotes.ts`, so `lib/bookings.ts` can import it without pulling the quote state machine into every availability reader.
- `web/src/lib/bookings.ts`: `SlotOccupancy.eventHolds?` and `countSlotOccupancy` unions the holding quotes into the map (one extra indexed read per range, in parallel with the bookings count). `slotOccupancyOn` inherits it, so the checkout re-check, the enquiry day check, the manual booking and a booking move all refuse a held day with no code of their own.
- `web/src/lib/availability.ts`: `SlotAvailability.heldByEvent`; `describeSlot` zeroes `driversLeft`/`vehiclesLeft` and clears `bookable` on a held day; `fitsParty` answers `unavailable`. `toPublicDay` is unchanged and carries none of it.
- `web/src/app/api/stripe/webhook/route.ts`: `revalidatePath("/", "layout")` when a quote payment is `recorded` or `already` and the quote now holds its day.
- `web/src/app/admin/sales/actions.ts`: the same revalidation when a refund calls the event off and on "Cancelar evento".
- `web/src/app/admin/calendar/page.tsx` + `web/src/components/admin/availability-calendar.tsx`: a held day's chips render dark and struck through ("ocupada por um evento" for screen readers); the day sheet lists the event first — Casamento/Evento, name or quote ref, venue, "Dia inteiro", link to the lead — with a "Conflito: N reservas neste dia" badge when tours are already sold on it.
- `web/src/lib/quote-builder.ts` + `web/src/app/admin/sales/[id]/page.tsx` + `web/src/components/admin/lead-quote-card.tsx`: `summariseClash` / `bookingClashesForDrafts` (through `bookingsBetween`, so "live" is the occupancy's own predicate); the draft shows a warning with the count and departures, and the "Enviar" confirmation repeats it. Sending is never blocked.
- Tests: `event-holds.test.ts` (new), `availability.test.ts`, `quote-builder.test.ts`, `route.quote.test.ts`.

## Acceptance criteria status

- [x] Deposit paid → both departures unbookable, checkout refused — `countSlotOccupancy` merges the hold; `describeSlot`/`fitsParty` refuse; tested at the pure layer.
- [x] Transfer write-off holds the same — `statusAfterPayment` → `deposit_paid` → holds; tested.
- [x] `paid` holds; `draft`/`sent` hold nothing — tested.
- [x] `cancelled` releases to rows + bookings alone — derived, so nothing to reopen; tested (released open row bookable, never-opened day stays unopened).
- [x] No write to `availability`, no migration.
- [x] Public pages revalidated on a hold flip — webhook (recorded/already), refund-with-cancel, "Cancelar evento". See Notes for Release on the two paths that cannot.
- [x] Enquiry check, manual booking and move refused through the shared count — all read `countSlotOccupancy`/`slotOccupancyOn` → `describeSlot`/`fitsParty`.
- [x] Calendar shows the held day and the event on the day sheet.
- [x] Clash marker on the day sheet; bookings untouched.
- [x] Builder warning on the draft and at send; sending still works.
- [x] No public leak — `toPublicDay` payload asserted free of any event field or note.
- [ ] Unit tests + CI green — tests written; CI verdict pending the ready flip.

## Notes for Release

- **Two paths that change the hold cannot revalidate, by design:** `reconcileQuoteReturn` runs inside the quote page's render (Next forbids `revalidatePath` there), and `cancelPayment` (the transfer write-off) has no UI caller yet. The webhook revalidates on `already` to cover the first; the second is only a lib function today. In both cases the checkout re-check is dynamic and refuses the day at once — only the cached public grid can lag by up to the hourly ISR window.
- The "checkout re-check refuses a held day" criterion is tested at `describeSlot` + `fitsParty` (the whole of `checkSlotAvailable`'s decision); `checkSlotAvailable` itself only adds `readDay`, a DB read, per the repo's convention that queries are covered by the build.
- `countSlotOccupancy` now issues two queries in parallel instead of one on every availability read (public calendar, checkout, admin). Both indexed.
- Context budget: Build read `quote-refund.ts`, `quote-checkout.ts`, the webhook route and the Sales detail page beyond `touches:` to place the revalidation and the builder warning.
