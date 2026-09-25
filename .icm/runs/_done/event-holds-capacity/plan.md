# Plan: event-holds-capacity

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The hold predicate and query** — `web/src/lib/quotes.ts`: one exported predicate "a quote
   holds its date" (`status in ('deposit_paid','paid')`, in TS and SQL, kept in step like
   `holdsCapacity`/`holdsCapacitySql`) and a read `eventHoldsBetween({from,to})` returning
   quote id, ref, event date, venue, and the lead's kind and name (null after erasure) via a
   left join to `tour_requests`. Uses the existing `quotes_status_event_date_idx`. Done when:
   unit tests cover draft/sent (no hold), deposit_paid, paid, transfer write-off (reaches
   `deposit_paid` via `statusAfterPayment`), cancelled (released).
2. **The chokepoint** — `web/src/lib/bookings.ts` `countSlotOccupancy`: union the holds in.
   `SlotOccupancy` gains an `event` field (the holding quote(s)), and a held departure counts
   every driver as taken, so `describeSlot` / `fitsParty` / `checkSlotAvailable` /
   `checkDayBookable` refuse it unchanged. `slotOccupancyOn` inherits it. Check
   `web/src/lib/availability.ts` `describeSlot`: the reason a held slot is unbookable must be
   distinguishable (`event`) for the admin, and must collapse to plain "unavailable" in
   `toPublicDay` and the checkout's reason. Done when: tests show the checkout re-check, the
   enquiry day check, the manual booking and the booking move all refuse a held day, and a
   cancelled quote leaves the day exactly as rows + bookings say.
3. **Freshness** — revalidate the public booking pages (`/[locale]/reservar`, same call shape
   the calendar actions already use) wherever a quote starts or stops holding: deposit recorded
   in `web/src/lib/quote-checkout.ts` (`recordQuotePayment`, `reconcileQuoteReturn`, reached
   from `web/src/app/api/stripe/webhook/route.ts`), the transfer write-off
   (`cancelPayment` path in `web/src/app/admin/sales/actions.ts`), and `cancelEvent` in
   `web/src/lib/quote-refund.ts` plus the quote-cancel paths in `quotes.ts`. Revalidate only
   when the holding state actually flipped. Done when: each path's test (or the existing webhook
   quote test) asserts the revalidation fires on a flip and not otherwise.
4. **The admin Calendar** — `web/src/app/admin/calendar/page.tsx` reads `eventHoldsBetween`
   for the month and passes events by date; `web/src/components/admin/availability-calendar.tsx`
   shows a held day as an event in the grid and lists it first on the day sheet (Casamento /
   Evento, name, venue, "Dia inteiro", quote ref, link to `/admin/sales/<lead>`), with the
   clash marker "Conflito: N reservas neste dia" when that date also has live bookings. Words
   from `.icm/docs/admin-pt-inventory.md`. Done when: the day sheet renders both cases on the
   preview.
5. **The builder warning** — `web/src/lib/quote-builder.ts`: a read counting live bookings on
   the quote's event date per departure (reuse `datesWithBookings` or the occupancy predicate —
   never a second definition of "live"); `web/src/components/admin/lead-quote-card.tsx` shows
   the warning on the draft and at "Enviar", non-blocking. Done when: a test covers the count
   and sending still succeeds with a clash.

## Risks

- A second definition of "live booking" or "holding quote" creeping in — the signal is a
  predicate written inline instead of the shared one; keep one TS + one SQL pair each.
- The public payload leaking the event (a reason string or venue in `PublicDay`) — the signal
  is any event field reaching `toPublicDay` output; assert it in a test.
- ISR staleness mistaken for a bug on the preview — the checkout re-check is the authority;
  revalidation only shortens the window.
- `countSlotOccupancy` gaining a second query per call on hot public paths — keep it one extra
  indexed read per range, not per slot.
