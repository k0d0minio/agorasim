# Stub: The calendar reads as an Airbnb grid — and writes a range by tapping two days

- feature-slug: calendar-airbnb-grid
- epic: feedback-2026-09
- priority: P1
- size: L
- depends-on: none
- sequence: 1 of 1
- sources: user feedback (2026-09); `web/docs/admin-mobile-design-spec.md` (D2, T1, T6, F2, V3)

## Problem

The admin calendar at `/admin/calendar` paints each day with compact codes
(`10h·2`, `10h✓`, `10h×`, `10h`) that only make sense against the legend at the
bottom, and the legend is easy to miss on a phone. There is no way to see which
days actually carry bookings, and writing a stretch of days demands the season
fields instead of the calendar itself.

## Proposed change

Rework `web/src/components/admin/availability-calendar.tsx` toward the Airbnb
host-calendar idiom, presentation-only — data model, sweep/season semantics and
the server actions stay untouched:

- Day tiles read without a legend: a chip per departure uses the state colours
  (green `--primary` = open/bookable, red `--destructive` = closed, dashed muted
  = undecided; a struck-through time means the departure is spent, not closed).
- Live bookings are visible on the grid (a dot per day) and in the day sheet
  (per booking: name or ref, experience, party size, payment status, linking to
  the sales lead at `/admin/sales/[tourRequestId]`).
- A tap on "Marcar um período" arms the grid; a second and third tap name the
  two ends of a contiguous range; the operator then opens, closes or clears it
  through the existing actions' `from`/`to` fields. No drag (T6).
- Month paging stays link-based (V3); everything is Portuguese; the mobile spec
  holds (44px targets, 12px floor, 320px reflow).

## Acceptance criteria (rough)

- [ ] A day's state is readable without the legend on a 320px phone
- [ ] Booked days show a dot on the grid; the day sheet lists each live booking
      with ref, experience, party and payment status, linking to the lead
- [ ] Tapping two days opens a period card that can open, close or clear the
      range through the existing server actions
- [ ] All new strings Portuguese; month paging as links; no drag anywhere
- [ ] CI green

## Prompt

In the agorasim repo, finish the admin calendar rework described in
`.icm/intake/feedback-2026-09/calendar-airbnb-grid.md` (the stub may already be
in `_done/` — the session that created this epic shipped the work in the same
PR). Files: `web/src/components/admin/availability-calendar.tsx`,
`web/src/app/admin/calendar/page.tsx`, `web/src/lib/bookings.ts`. Keep the data
model and the server actions untouched — the grid range pick reposts the
existing `from`/`to` fields. PR on a `claude/` branch; no local checks — CI is
the source of truth.