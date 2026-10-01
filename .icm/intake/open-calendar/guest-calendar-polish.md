# Stub: An Airbnb-style date picker for guests

- feature-slug: guest-calendar-polish
- scope: open-calendar
- personas: guest
- initiative: ③ Instant booking / objective: the calendar is kept up to date by two non-technical people from a phone, and guests see every day the business can actually run
- depends-on: open-by-default
- sequence: 3 of 3
- complexity: medium
- priority: P2
- recommended-model: sonnet

## Problem

Once most days are open, the guest picker on /reservar must make the few unavailable ones and
the choice of time obvious at a glance, the way Airbnb does.

## Proposed change

Unavailable days are crossed out. On a laptop two months sit side by side; on a phone one. The
guest picks a day, then a time (10:00 or 14:00) — only the times their party fits are offered.
A summary line confirms the choice ("Quarta, 14 de outubro · 10:00"). Today and tomorrow read as
unavailable. PT and EN in sync.

## Acceptance criteria (rough)

- [ ] Unavailable days are visibly crossed out and cannot be picked.
- [ ] Two months show side by side from laptop width; one on a phone.
- [ ] After the day, the guest picks 10:00 or 14:00; a time their party cannot take is not offered.
- [ ] A summary of the chosen day and time is shown before checkout, in PT and EN.
- [ ] The "none of these days work?" way out stays.
- [ ] The picker still offers exactly what the server will accept.

## Out of scope (this feature)

- Price display inside the calendar.
- Any change to checkout, payment or the enquiry form's fields.

## Notes for Define

- D-10 the Airbnb-style finish · D-2 six months shown · D-3 today and tomorrow unavailable.
- Open: the page is rebuilt at most hourly, so just after midnight it may show tomorrow as
  bookable for up to an hour (the server refuses it on submit). Acceptable, or should the picker
  also check the date in the browser?
- touches: web/src/components/booking-date-picker.tsx, web/src/components/booking-checkout-form.tsx,
  web/src/app/[locale]/reservar/page.tsx, web/src/content/booking.ts.
