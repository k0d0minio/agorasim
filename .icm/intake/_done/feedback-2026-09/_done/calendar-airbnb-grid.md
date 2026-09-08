# Stub: The availability calendar reads like Airbnb's host calendar

- feature-slug: calendar-airbnb-grid
- epic: feedback-2026-09
- priority: P1
- size: L
- depends-on: none
- sequence: 1 of 3
- sources: Rita's feedback relayed by Jamie, 2026-09-07 ("closer to Airbnb's design,
  for Rita to have an easier time"); `web/src/components/admin/availability-calendar.tsx`
  (`slotTone`, `cellAppearance`, the legend at the bottom);
  `web/docs/admin-mobile-design-spec.md`

## Problem

The calendar Rita opens every morning encodes each departure as a coded caption —
`10h·2` (on sale, 2 drivers free), `10h×` (closed), `10h✓` (sold out), grey `10h`
(undecided) — and carries day state in thin borders (`border-primary/50 bg-primary/10`
vs `border-dashed`). It ships a four-entry legend because it needs one. Bookings are
not visible on the grid at all: a sold departure is a `✓`, with no way to see who is
going out that day without leaving the screen. Airbnb's host calendar is the design
Rita already knows: day tiles whose whole fill states available / blocked / booked at
a glance, no legend required, a tap opening the day's detail, a range picked by
tapping its two ends.

## Proposed change

A presentation redesign of `availability-calendar.tsx` — the data model (one shared
calendar, roster of drivers, two departures a day), the server actions, and the
sweep/season semantics all stay exactly as they are.

- Day tiles read without a legend: whole-tile fills/strikethroughs for open, closed,
  undecided and past, in the Airbnb idiom; a day with live bookings shows it (a dot,
  a count, or a filled band), fed from the `occupancy` map the page already loads
  (`web/src/app/admin/calendar/page.tsx`).
- The day sheet (`DayEditor`) leads with what the day *is* — each departure's state
  and its bookings — before the controls that change it.
- Range selection by tapping a start and an end day on the grid, feeding the same
  write the season window's two date fields feed today (keep the fields as the
  accessible/precise alternative; sweeps and their confirmations stay).
- Month paging stays `<Link>`-based (V3), and the mobile spec still governs: ≥44px
  targets (T1), 12px caption floor (F2), 320px reflow (D2), nothing requiring a
  drag (T6).

## Acceptance criteria (rough)

- [ ] Every day state distinguishable from the tile alone; legend removed or vestigial
- [ ] Live bookings visible on the grid and listed in the day sheet
- [ ] Tap-tap range selection writes the same rows the season window does
- [ ] Roster stepper, notes, sweeps and confirmations still work; CI green

## Prompt

In the agorasim repo (`web/`), redesign the admin availability calendar toward
Airbnb's host-calendar idiom per
`.icm/intake/feedback-2026-09/calendar-airbnb-grid.md` — read that stub first. This
is presentation only: keep the data model, server actions and sweep/season semantics
in `web/src/app/admin/calendar/` and `web/src/lib/availability.ts` untouched. Rework
`web/src/components/admin/availability-calendar.tsx` so day tiles read without a
legend, live bookings (from the occupancy the page already loads) are visible on the
grid and in the day sheet, and a date range can be picked by tapping two days. Honour
`web/docs/admin-mobile-design-spec.md` (44px targets, 12px floor, 320px reflow, no
required drag) and keep month paging as links. All strings Portuguese — the admin is
PT (D4 in `.icm/project.md`). PR on a `claude/` branch; no local checks — CI is the
source of truth.
