# Stub: Make the calendar's bulk sweeps safe — confirm, and never null Rita's notes

- feature-slug: calendar-sweep-safety
- epic: booking-live
- priority: P1
- size: S
- depends-on: land-availability-pools
- sequence: 5 of 8
- sources: 2026-08-29 ux lens on the PR #31 branch: `availability-calendar.tsx` BulkActions/SeasonWindow fire unconfirmed; `lib/availability.ts` `upsertDays` sets `note: null` and resets `drivers`; repo's own pattern `delete-submission-dialog.tsx:34`; `web/docs/admin-mobile-design-spec.md:58` ("Nothing below 12px")

## Problem

On the landed PR #31 calendar, "Close all", "Open all/weekends" and "Close this
range" (up to a year) fire on one tap with no confirmation and no undo — and the
upsert unconditionally nulls every per-day note ("Casamento, revisão do carro…") and
resets driver rosters in the range. A mis-tap on Rita's phone silently destroys her
operational annotations. Separately, the day-cell slot captions render at ~8.8px
(`text-[0.55rem]`), below the repo's own 12px mobile floor — this is the
outdoor-sunlight screen that rule was written for.

## Proposed change

Bulk/season actions get a confirmation step stating the range and what changes
(HIG-style: the destructive path is explicit, the safe path is default); `upsertDays`
preserves existing `note` and `drivers` unless the action explicitly edits them;
captions lifted to ≥12px without breaking the month grid on a 375px phone.

## Acceptance criteria (rough)

- [ ] No bulk sweep executes without a confirmation naming the range
- [ ] Sweeping a range never clears notes or driver adjustments
- [ ] Smallest calendar text ≥12px at default zoom; grid intact on 375px
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), after the driver/vehicle availability calendar has
landed (PR #31): add confirmation to the calendar's bulk and season-close actions,
make `upsertDays` in `web/src/lib/availability.ts` preserve `note` and `drivers`
unless explicitly set, and lift the day-cell captions in
`web/src/components/admin/availability-calendar.tsx` to the 12px floor the repo's own
`web/docs/admin-mobile-design-spec.md` mandates. Follow the existing confirmation
pattern in `web/src/components/admin/delete-submission-dialog.tsx`. Read
`.icm/intake/booking-live/calendar-sweep-safety.md` for context. PR on a `claude/`
branch; no local checks — CI is the source of truth.
