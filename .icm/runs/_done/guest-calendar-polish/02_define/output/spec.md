# Spec: An Airbnb-style date picker for guests

- slug: guest-calendar-polish
- personas: guest
- touches: web/src/components/booking-date-picker.tsx, web/src/components/booking-checkout-form.tsx, web/src/components/tour-request-form.tsx, web/src/content/tour-request.ts, web/src/content/logistics.ts
- complexity: standard

## Problem

Since `open-by-default` merged, almost every day on /reservar is open, and the few that are not
(blocked by the team, full, held by an event, inside the two days' notice) are only a faint grey
number that is easy to miss. On a laptop the picker still shows one month at a time, and the
summary of the choice names the day but not the departure. This advances initiative ③ Instant
booking, objective: *guests see every day the business can actually run* — the guest side of
that objective is seeing at a glance which days are not on offer and what exactly they picked
(D-10). It is the third of three stubs in the `open-calendar` scope.

## Proposed change

Everything below is in the shared picker on /reservar, so both the checkout (pay now) and the
enquiry form get it; only the checkout has the time step.

- **Unavailable days are crossed out.** A day no party could be sold (past, today, tomorrow,
  past the six-month window, blocked, full or held) shows its number struck through and cannot
  be picked. Available days keep their outlined look; the chosen day stays filled. The guest is
  still never told why a day is unavailable.
- **Two months side by side from laptop width; one on a phone.** From the `lg` breakpoint
  (1024 px) two consecutive months sit side by side under one pair of arrows; below it, one
  month as today. One arrow press moves one month (Oct + Nov → Nov + Dec). The second month is
  never past the six-month window: at the last month the pair is the last two months.
  The picker still opens on the month of the chosen day, or the first month with an opening.
- **Pick the day, then the time** (checkout only). After the day, its departures appear as
  chips (10:00 / 14:00, labelled per tour as today). A departure this party cannot take stays
  visible but greyed out and cannot be picked — as today. When only one departure fits, it is
  chosen for the guest, as today.
- **A summary line confirms the choice**, replacing today's "Escolhido: quarta-feira, 14 de
  outubro de 2026". Format, no year:
  - checkout, day and time chosen: "Quarta, 14 de outubro · 10h00" / "Wednesday, 14 October ·
    10:00" for a tour whose departures have a clock time (Rural Saloia); "Quarta, 14 de outubro
    · manhã" / "Wednesday, 14 October · morning" for one whose time is confirmed by email
    (Óbidos — `departureTimeFollowsByEmail`);
  - checkout, day chosen but no time yet, and the enquiry form: the day alone ("Quarta, 14 de
    outubro").
  The "Limpar" / "Clear" button stays beside it.
- **Today and tomorrow are unavailable even on a stale page.** /reservar is cached for up to an
  hour, so just after midnight the payload can still offer tomorrow. The picker also works out
  today in Portuguese time (Europe/Lisbon) in the browser and crosses out any day before today
  + 2 (D-3), on top of what the payload says. A chosen day that this check rules out is dropped.
- **The way out stays.** "None of these days work?" still swaps the grid for a text box in the
  enquiry and links to the contact page in the checkout.
- PT and EN in sync for every new or changed string.

## Acceptance criteria

- [ ] An unavailable day shows its number struck through, is not focusable as a choice and does
      nothing when tapped; an available day is not struck through. (D-10)
- [ ] At 1024 px wide and above the picker shows two consecutive months side by side; below
      1024 px it shows one. One arrow press moves one month, and the pager never shows a month
      outside the six-month window. (D-2, D-10)
- [ ] In the checkout, after a day is picked its departures appear as chips; a departure the
      current party cannot take is greyed out and cannot be picked; with one usable departure it
      is pre-selected. (D-10)
- [ ] The summary line reads "Quarta, 14 de outubro · 10h00" (PT) / "Wednesday, 14 October ·
      10:00" (EN) for Rural Saloia, "… · manhã" / "… · morning" for Óbidos, and the day alone
      before a time is chosen and in the enquiry form. No year.
- [ ] With the browser clock set to 00:30 Lisbon time on day D and a payload built on day D−1,
      day D+1 is crossed out and cannot be picked; day D+2 is pickable if the payload offers it.
      (D-3)
- [ ] "None of these days work?" still swaps to the text box in the enquiry form and links to
      the contact page in the checkout.
- [ ] The picker offers exactly what the server accepts: every day/departure it lets the guest
      pick passes `checkSlotAvailable` for that party, and nothing it crosses out would.
- [ ] Every new or changed guest-facing string exists in PT and EN.

## Out of scope

- Price display inside the calendar.
- Any change to checkout, payment, or the enquiry form's fields and server rules.
- Telling the guest why a day is unavailable.
- The admin calendar (that is `admin-block-days`).
- Range selection or multi-day bookings.

## Open questions

- none

Settled in Define (2026-10-01, Jamie): the browser also checks the date (closes the scope's open
point on the hourly rebuild); a departure the party cannot take is greyed, not hidden; the
summary is day + short time with no year, "manhã/tarde" where the tour has no clock time yet;
one arrow press moves one month.
