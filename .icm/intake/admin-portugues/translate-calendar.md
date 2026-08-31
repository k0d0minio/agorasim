# Stub: O calendário em português — depois de aterrar o PR #31

- feature-slug: translate-calendar
- epic: admin-portugues
- priority: P1
- size: M
- depends-on: translate-shell-and-nav
- sequence: 5 of 7
- sources: D4; ux lens (the calendar is Rita's other daily screen); `.icm/docs/admin-pt-inventory.md` §5.1 (`calendar/page.tsx`, `calendar/actions.ts` — 11 messages), §5.2 (`availability-calendar.tsx` — 33), §5.3 (`lib/availability.ts` already has `pt`); PR #31 `origin/claude/agorasim-availability-capacity-k0iild` measured 2026-08-31

## Problem

The availability calendar is the second screen Rita opens daily, and it is 46 strings
across a 700-line component. It is also the one admin surface with a live rewrite
pointed at it: **PR #31 is not merged**. Against current `main` that branch changes
`availability-calendar.tsx` by ~390 lines, `calendar/actions.ts` by 87 and
`calendar/page.tsx` by 69, replacing per-tour seat counts with driver and vehicle
pools (D1).

Translating first buys a conflict on the largest component in the admin and a second
translation pass over the strings PR #31 adds. This is the reason this stub moved
behind the catalogue and settings work in the recut, even though the calendar
outranks both on daily value.

## Proposed change

Land after `booking-live/land-availability-pools` merges, then translate what that PR
leaves behind:

- `app/admin/calendar/page.tsx` and `calendar/actions.ts` (11 result messages)
- `components/admin/availability-calendar.tsx`, `DayEditor` included
- `lib/availability.ts` — `formatDay`, `formatMonth` and `WEEKDAY_INITIALS` already
  take a locale and already have a `pt` branch; the admin callers pass `"en"`. Switch
  the callers rather than adding strings.

The inventory's §5.2 calendar table is written against `main` at `d8b5a58`, so it will
be partly stale once the pools land. Treat it as the vocabulary source (*partida*,
*lugar*, *fase*, and the pool/driver words the glossary settles) and re-read the
component for the strings PR #31 introduces, rather than assuming the table is
complete. Anything genuinely new gets its rendering decided here and appended to §5.2
so the document stays the single source.

If PR #31 is still stranded when this stub comes up and something forces the calendar
into Portuguese sooner, say so on pick-up rather than translating around it — the
conflict is the expensive part, not the words.

## Acceptance criteria (rough)

- [ ] `booking-live/land-availability-pools` is in `_done/` before this stub starts
- [ ] Calendar page, actions and `availability-calendar.tsx` fully PT, post-pools
- [ ] Day and month names come from `lib/availability.ts`'s `pt` branch, not new strings
- [ ] Inventory §5.2 amended with any strings PR #31 introduced
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), translate the admin availability calendar to Portuguese
per `.icm/intake/admin-portugues/translate-calendar.md`. **First check that
`.icm/intake/booking-live/land-availability-pools.md` has moved to that epic's `_done/`**
— PR #31 rewrites this exact component by ~390 lines, and translating ahead of it
means doing the work twice. Scope once it has landed:
`web/src/app/admin/calendar/page.tsx`, `web/src/app/admin/calendar/actions.ts` (11
result messages), `web/src/components/admin/availability-calendar.tsx` including
`DayEditor`, and switching the `lib/availability.ts` callers from `"en"` to `"pt"`
(that module already renders Portuguese day and month names — do not add new ones).
Take vocabulary from `.icm/docs/admin-pt-inventory.md` §5.2; its line numbers predate
PR #31, so re-read the component and append the renderings for any new strings to that
document in the same PR. Requires `translate-shell-and-nav` merged. Hardcoded PT, no
i18n rig (D4). PR on a `claude/` branch; no local checks — CI is the source of truth.
