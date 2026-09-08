# Breakdown: September feedback — Rita's calendar, cash sales, and Óbidos billing

- epic-slug: feedback-2026-09
- sources: client feedback relayed by Jamie, 2026-09-07 (Rita on the calendar; Diogo
  on the experiences page and add-ons; both on cash bookings)

## What I understood

Three asks from one feedback round, all pointing at how Diogo & Rita actually run the
business day to day.

**The calendar reads like a control panel, not a calendar.** The availability screen
(`web/src/components/admin/availability-calendar.tsx`) encodes each departure as a
caption — `10h·2`, `10h×`, `10h✓` — that only makes sense with the legend underneath
it, and state is carried by thin borders. Rita wants it closer to Airbnb's host
calendar: day tiles whose fill says available / blocked / booked at a glance, a tap
opening the day's detail, ranges picked by tapping two days. The data model under it
(shared roster, two departures, sweeps, season window) is right and stays.

**Cash sales happen outside the system, and the system doesn't know.** The only path
that inserts a `bookings` row is Stripe checkout (`web/src/lib/booking-checkout.ts`).
A tour sold on the phone and paid in cash takes a real driver and a real car, but the
website's occupancy arithmetic never hears about it — so the site can sell the same
departure again. Diogo & Rita need to record a booking manually, with a cash-deal
amount, and have it count against capacity exactly like a paid checkout.

**The experiences page plays favourites.** `signatureOf` picks the *first* signature
tour into a full-width hero labelled "Experiência principal", and Óbidos — also
`kind === "signature"` in the catalogue — is demoted to an "Outras experiências"
card below (`web/src/app/[locale]/experiencias/page.tsx`). Diogo wants both tours
billed evenly, and the add-ons (currently the last, muted section) made more visible.

The order stops the same surface being built twice: the calendar redesign lands
first because the manual-booking form's natural entry point is the redesigned day
sheet — building it into today's day editor means restyling it a stub later. The
experiences page is independent and can land any time.

## Build order

1. calendar-airbnb-grid — the availability calendar reads like Airbnb's — depends-on: none
2. manual-cash-booking — record a phone/cash sale so the website can't double-book it — depends-on: calendar-airbnb-grid
3. experiences-equal-billing — both tours billed evenly, add-ons visible — depends-on: none

## Out of scope (whole epic)

- Event/wedding pricing — that is `quote-flow/` (a cash *tour* booking is a catalogue
  price or a simple negotiated amount, not a quote with terms and deposits).
- Any change to the availability data model or the pooled drivers/cars arithmetic
  (AGORA-012) — both stubs 1 and 2 build on it as it stands.
- The public `/reservar` date picker — this round of feedback is about the admin
  calendar; the public picker has its own triage item (`booking-picker-sub-12px`).
