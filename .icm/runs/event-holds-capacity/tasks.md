# Tasks: event-holds-capacity

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

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

## Queue

- [ ] <task — small enough for one commit; name the file or area>
