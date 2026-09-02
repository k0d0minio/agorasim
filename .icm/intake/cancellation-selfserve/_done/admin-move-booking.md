# Stub: Move a booking — the bad-weather reschedule

- feature-slug: admin-move-booking
- epic: cancellation-selfserve
- priority: P2
- size: M
- depends-on: admin-cancel-refund
- sequence: 4 of 4
- sources: info PDF §1.4 ("Try to reschedule via email or refund on extreme conditions" — the client's own weather policy); 2026-08-29 data lens question (reschedule has no data shape); register default: audited in-place edit

## Problem

The client's stated weather policy is reschedule-first — but a booking's date/slot
can't be changed anywhere: no admin action, no representation of "moved". Rita's only
tool would be cancel + manually re-create, losing the payment linkage.

## Proposed change

An admin "Mover reserva" action: pick a new (date, slot) the pools can hold (same
vehicle-class check as a new booking), edit in place, audit-log the old→new values
(register default — no history table), email the guest the new details with the
meeting-point block. Refuse moves that break capacity.

## Acceptance criteria (rough)

- [ ] Move re-validates driver/vehicle pools at the target departure
- [ ] Audit log carries old and new date/slot; guest gets the updated email
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add an admin move-booking action per
`.icm/intake/cancellation-selfserve/admin-move-booking.md`: `requireAdmin()`-guarded
server action that re-runs the availability check (`web/src/lib/availability.ts` +
`web/src/lib/fleet.ts`) for the target (date, slot), updates the booking in place,
writes before/after into `audit_log` (see `web/src/lib/audit.ts` redaction
conventions), and re-sends the guest confirmation-style email with the new departure.
UI on the admin booking detail with a date/slot picker limited to viable departures.
PR on a `claude/` branch; no local checks — CI is the source of truth.
