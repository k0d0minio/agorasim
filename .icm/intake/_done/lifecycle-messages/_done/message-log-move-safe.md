# Stub: A weather move no longer silences the reminder, and every send is in the log

- feature-slug: message-log-move-safe
- scope: lifecycle-messages
- personas: guest, team
- initiative: contracted feature ⑤ complete after launch / objective: every automatic send recorded exactly once
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 4
- sources: data lens 2026-09-18 — `web/src/db/schema.ts:1149-1151` (`message_log` uniqueness `(kind, recipient, booking_id)`, no date); `web/src/lib/booking-move.ts:17` ("no history table and no 'moved' status"; edits `date`/`slot` in place, touches no log row); `schema.ts:256-260` (`message_status` has no `superseded`); `lib/booking-refund.ts:352`, `lib/booking-cancellation.ts:337`, `lib/booking-move.ts:337` call `sendEmail` directly although the `booking-cancellation` and `booking-moved` kinds exist in the enum (`web/drizzle/0021_message_log.sql`)

## Problem

Weather moves are decided the day before — exactly when the reminder has just gone out.
With the log keyed on `(kind, recipient, booking)` and no notion of the date, the reminder
for the original date permanently claims the slot and the moved booking is never reminded
again. Separately, three shipped sends (guest cancellation, team cancellation, guest
"moved") bypass the log, so the Notifications page built in stub 4 would show no
cancellations or moves.

## Proposed change

Make the reminder's idempotency key include the booking's date (or add a `superseded`
status the move sets on that booking's `day-before-reminder` rows — Define picks the one
that reads better in the schema), so a moved booking earns a fresh reminder for its new
date and never a second one for the old. Route the three direct sends through
`message-log.ts`'s claim/record pattern under their existing kinds. One migration, no
behaviour change for guests today.

## Acceptance criteria (rough)

- [ ] A booking reminded, then moved to a later date, is reminded again for the new date and not again for the old one (test)
- [ ] Guest cancellation, team cancellation and moved emails each write one `message_log` row with their kind; a retried send does not write a second
- [ ] CI green; migration applied by `db-migrate` on merge

## Out of scope (this feature)

- The reminder and thank-you jobs themselves (stubs 2 and 3).
- A booking history table for moves — the in-place audited move stands (register).

## Notes for Define

- D24 and the review ask do not touch this stub; it is bookkeeping for stubs 2–4.
- Open for Define: uniqueness-with-date versus a `superseded` status — choose by which
  makes stub 2's query simplest; say why in the spec.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/lifecycle-messages/message-log-move-safe.md`
and `.icm/intake/lifecycle-messages/breakdown.md`. Change the message-log idempotency so a
moved booking can be reminded for its new date, and route the cancellation and moved sends
in `src/lib/{booking-refund,booking-cancellation,booking-move}.ts` through the log under
their existing kinds. One migration; tests for the move case and the once-only rule. PR
on a `claude/` branch; no local checks — CI is the source of truth.
