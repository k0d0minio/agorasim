# Stub: O calendário em português — reinventariar depois do PR #31

- feature-slug: translate-calendar
- epic: admin-portugues
- priority: P1
- size: L
- depends-on: translate-shell-and-nav
- sequence: 3 of 7
- sources: D4; ux lens (the calendar is Rita's other daily screen); `.icm/docs/admin-pt-inventory.md` §5.1 + §5.2 (written against `d8b5a58`, now partly stale — see below), §5.3 (`lib/availability.ts` already renders `pt`); PR #31 landed 2026-08-31 as `89046bb` (#38)

## Problem

The availability calendar is Rita's other daily screen and the largest single body of
English left in the console. **PR #31 landed while this batch was being recut** (#38,
D1: availability became shared driver and vehicle pools), and it rewrote exactly these
files: `availability-calendar.tsx` by ~390 lines (now 786), `calendar/actions.ts` by 87
(now 219) and `calendar/page.tsx` by 69.

So the gate this stub was waiting on is lifted — and the inventory's calendar section
is the one part of that document that no longer describes the code. §5.2 counted 33
strings in `availability-calendar.tsx`; the component now holds roughly 180, and they
are not the same strings. The pools model brought vocabulary the glossary has never
seen: "Put on sale", "One driver fewer" / "One driver more", the two departure labels,
the vehicle classes, the open/close/clear verb set and their `…ing` busy states.

## Proposed change

Two steps, in one PR, in this order:

1. **Re-inventory the calendar.** Walk the three files as they now stand, list every
   user-facing string, and decide the Portuguese for the new pools vocabulary —
   *condutor*, *veículo* and the vehicle classes especially, since the same words will
   reappear in `booking-live`'s remaining stubs and in the booking form. Append the
   result to `.icm/docs/admin-pt-inventory.md` §5.2, replacing the stale table rather
   than adding a second one, and add the new terms to §3 so the glossary stays the
   single source. Keep the existing register rules (§3.7): PT-PT, *você* implicit,
   singular.
2. **Translate**, from that refreshed table: `app/admin/calendar/page.tsx`,
   `app/admin/calendar/actions.ts` and `components/admin/availability-calendar.tsx`
   including `DayEditor`.

`lib/availability.ts` survived #31 with its locale support intact: `formatMonth`,
`formatDay` and `WEEKDAY_INITIALS` already take `"pt" | "en"` and already render
`pt-PT`. Switch the admin callers from `"en"` to `"pt"` — do not add day or month
names.

One string is already Portuguese (`"Casamento, revisão do carro…"`, a placeholder).
Leave it; it is the register the rest should match.

## Acceptance criteria (rough)

- [ ] Inventory §5.2's calendar table replaced against the post-#31 component; new
      pools vocabulary added to §3
- [ ] Calendar page, actions and `availability-calendar.tsx` fully PT
- [ ] Day and month names come from `lib/availability.ts`'s `pt` branch, not new strings
- [ ] The words chosen for drivers, vehicles and vehicle classes are the ones
      `booking-live` and the booking form can reuse — one term per concept, as §1 did
      for *pedido*
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), translate the admin availability calendar to Portuguese
per `.icm/intake/admin-portugues/translate-calendar.md`. **Read the stub first — this
one is not a straight application of the inventory.** PR #31 (merged as `89046bb`,
#38) rewrote these files after `.icm/docs/admin-pt-inventory.md` was written, so §5.2's
calendar table is stale: the component went from ~33 strings to ~180 and brought new
driver/vehicle-pool vocabulary. Step one is to re-inventory
`web/src/app/admin/calendar/page.tsx`, `web/src/app/admin/calendar/actions.ts` and
`web/src/components/admin/availability-calendar.tsx` and write the refreshed table back
into §5.2, adding the new terms (condutor, veículo, the vehicle classes, the
open/close/clear verbs) to §3 so one word per concept still holds — `booking-live`'s
remaining stubs and the guest booking form will reuse them. Step two is the
translation itself, from that table, plus switching the `lib/availability.ts` callers
from `"en"` to `"pt"` (that module already renders Portuguese day and month names —
do not add new ones). Keep the register rules in §3.7. Requires
`translate-shell-and-nav` merged. Hardcoded PT, no i18n rig (D4). PR on a `claude/`
branch; no local checks — CI is the source of truth.
