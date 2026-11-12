# Breakdown: Open groups share the van, and only paid work takes a seat

- epic-slug: seats-and-holds
- source: feedback round 2, Diogo and Rita, sent to Jamie on 2026-11-12 (pasted into a session),
  items "Public Group Tour", "unpaid booking occupies a seat" and "custom quotation car type".
  The session reproduced each item on `uat.agorasim.pt` on 2026-11-12.

## What I understood

Diogo and Rita booked three couples on one open-group departure (Rural Saloia, 21 November,
14h00). Couple 1 and couple 2 each got their own small classic (3 seats) and used both drivers.
The site refused couple 3. They expect one open group in the VW T3: 8 guests, one driver. The
engine does what the epic `open-and-private-tours` built: `assignVehicle` gives a party of 1 to 3
a small classic, and a party joins an open car only when that car has enough free seats
(`web/src/lib/fleet.ts` `assignVehicle` and `joinableCar`). Two couples cannot share a 3-seat car,
so each couple took a car and a driver. The session reproduced this on 28 November with the
same result: two `pending` bookings, two `shared_car_id` values, and the third couple refused.

They also say that an unpaid booking must not take a seat. Today a checkout holds its car for
30 minutes (`HOLD_MINUTES` in `web/src/lib/bookings.ts`), and the admin shows the held seats as
taken ("Carro partilhado · 2 de 3 lugares"). Their three test bookings were made within 30
minutes, so the holds were live. A lapsed hold stops counting, but its status label stays
`pending` until the weekly retention job (`expireLapsedHolds`). They ask for a button that
reminds the guest of an unpaid booking. Today the admin has only "Reenviar link" for
payment-link bookings.

Two more defects sit on the same engine. The guest calendar offered 14h00 to couple 3 and
the checkout then refused it: `/reservar` is rendered with `revalidate = 3600`, and a new booking
does not revalidate it. The scratch quote form asks for one car ("Carro"), but a tour quote can
use several cars. That field is what makes a quote a tour quote (`quotes.hold_vehicle_class`).
Without it a paid tour quote blocks the whole day like a wedding (`web/src/lib/event-holds.ts`).

### Questions for Diogo and Rita

1. Does every open-group departure of Rural Saloia ride in the VW T3 (8 guests, 1 driver)? Default: yes.
2. Your message stops at "and we also have a …". What is the rest? Default: no answer. The build waits for it.
3. The open van is full (8 guests). May a second open car start with the second driver? Default: yes, a small classic, up to 3 more guests.
4. The VW T3 is booked by a private group on that departure. Does the open group then use the small classics? Default: yes, as today.
5. Does an open group need a minimum number of guests to depart? Default: no.
6. A tour quote takes how many cars on its departure? Default: the whole departure (both drivers). Rita frees a car by hand when the group is small.

### Questions for Jamie

1. Keep a short hold while the guest is on the payment form, so two guests cannot pay for the last seat? Default: yes, 15 minutes, not shown as a booked seat in the admin.
2. Put this epic after `triage` in `## Order`? Default: yes.

## Build order

1. open-group-rides-the-van — open-group parties share the VW T3 up to 8 seats — depends-on: none
2. unpaid-bookings-hold-no-seat — only a paid booking takes a seat, and a lapsed hold leaves at once — depends-on: none
3. remind-unpaid-booking — a "Lembrar" button sends the guest a fresh payment link — depends-on: unpaid-bookings-hold-no-seat
4. guest-calendar-live-seats — the booking calendar shows the seats left now, not an hour ago — depends-on: open-group-rides-the-van
5. tour-quote-without-car — a scratch tour quote has no car field and still holds its departure — depends-on: none

## Out of scope

- Groups above 8 online and a third driver. The enquiry route stays.
- Óbidos open groups. They already share the touring vehicle (8 seats).
- Prices and tiers.
- The new visual style that Rita wants. Diogo puts texts, images and design after this round.
