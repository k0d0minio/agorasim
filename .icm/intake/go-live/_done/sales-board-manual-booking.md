# Stub: "Registar reserva" from the Sales board — a phone enquiry becomes a booking without the calendar detour

- feature-slug: sales-board-manual-booking
- epic: go-live
- priority: P1
- size: S
- depends-on: none
- sequence: 5 of 6
- sources: Jamie 2026-09-11 (manual booking must be reachable from the Sales board too); `web/src/components/admin/manual-booking-dialog.tsx` (`ManualBookingDialog({ date, openSlots, tours, onDone })`, action `createManualBooking` in `web/src/app/admin/calendar/actions.ts:288`); its only mount `web/src/components/admin/availability-calendar.tsx:493` (inside a day sheet, so the date and open slots are already known); `web/src/app/admin/sales/page.tsx`, `web/src/components/admin/lead-quick-actions.tsx`

## Problem

Rita takes bookings on the phone. The manual booking dialog exists but only opens from a
day inside the Calendar; from the Sales board — where the enquiry she is answering sits —
there is no way to turn it into a confirmed booking. She has to leave the lead, find the
day, open the sheet, retype the guest.

## Proposed change

Mount the same dialog on the Sales board: a "Registar reserva" action on an enquiry card
and on the lead detail, prefilled from the lead (name, email, phone, party size, tour if
known) with a date + slot picker that only offers open slots (reuse the availability
lookup the calendar uses; the action already validates capacity). On success the lead
moves to the booked stage and the audit log names the source enquiry. Phone-first,
Portuguese, ≥44px targets, nothing below 12px — the admin's existing rules.

## Acceptance criteria (rough)

- [ ] From a lead on the Sales board, a confirmed booking is created without opening the Calendar; guest fields prefilled
- [ ] Only open slots are offered; the calendar's capacity rules apply unchanged
- [ ] Lead stage updated and audit row written; CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/go-live/sales-board-manual-booking.md`.
Reuse `src/components/admin/manual-booking-dialog.tsx` and `createManualBooking` from
`src/app/admin/calendar/actions.ts` on the Sales board (`src/app/admin/sales/page.tsx`,
lead detail under `sales/[id]`): add a date + open-slot picker to the dialog for the
board mount, prefill from the lead, move the lead to the booked stage and record the
source enquiry in the audit log. Keep the calendar mount behaviour unchanged. Add tests
for the prefill and the stage move. `git mv` the stub to `.icm/intake/go-live/_done/`
in the same PR, on a `claude/` branch; CI is the source of truth.
