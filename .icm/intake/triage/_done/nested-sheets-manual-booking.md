# Stub: "Nova reserva" stacks a second sheet on top of the day sheet

- lane: tweak
- found-by: ux lens (/project) · 2026-09-18
- priority: P2

## Problem

The manual-booking dialog is mounted inside the day editor's `DialogContent`
(`web/src/components/admin/availability-calendar.tsx:492-501`,
`manual-booking-dialog.tsx:184-187`), so on a phone two 85dvh sheets and two scrims stack;
closing the inner drops Rita back into the outer. The admin spec's S7 says one modal at a
time; Radix nests correctly so this is a spec breach, not a WCAG one.

## Proposed change

Make the booking a step inside the day sheet, or close the day sheet first and reopen it on
cancel.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/nested-sheets-manual-booking.md`
and unstack the manual booking from the calendar's day sheet per admin spec S7, keeping the
Sales-board mount unchanged. `git mv` the stub to `_done/` in the PR, on a `claude/`
branch; CI is the source of truth.
