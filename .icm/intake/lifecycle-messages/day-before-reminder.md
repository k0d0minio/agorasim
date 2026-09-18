# Stub: The day-before reminder — "Tomorrow is the big day", with the pin

- feature-slug: day-before-reminder
- scope: lifecycle-messages
- personas: guest
- initiative: contracted feature ⑤ complete after launch / objective: the §2.6 reminder goes out by itself the morning before
- priority: P1
- size: M
- depends-on: message-log-move-safe
- sequence: 2 of 4
- sources: the client's copy, info PDF §2.6 (day-before reminder with the meeting point); product lens 2026-09-18 — `web/src/lib/bookings.ts:197-235` (`bookingsBetween` returns name/party only and includes `pending` holds via `holdsCapacitySql`); `web/src/lib/booking-checkout.ts:654-655` (the facts assembly to reuse: `meetingPoints[slug]`, `departureTimeFollowsByEmail`); `web/src/lib/cron/jobs.ts` (`register()`), `web/src/lib/cron/noop.ts` ("removed as soon as the first real job registers"), `web/vercel.json` (dispatch `0 6 * * *`); `message_kind` `day-before-reminder` exists (`0021`); `web/src/lib/booking-emails.ts` has no reminder template; copy lens — the PT greeting is feminine for every guest (`content/emails.ts:48`), the new template uses a neutral form

## Problem

The confirmation promises "the exact departure time follows by email" for Óbidos and every
guest expects the meeting point again the day before — the client wrote the message for
it. Nothing sends it: the dispatcher runs a placeholder every morning, and the only query
that lists bookings by date returns too little and includes unpaid holds.

## Proposed change

A query for "confirmed bookings on day D" that carries what the template needs — guest
email and locale, tour, slot, party bands, add-ons, payment method — including cash and
manual bookings and excluding pending holds; the reminder template in PT and EN in the
client's §2.6 voice (meeting point as a maps link, departure label, the honest "exact time
follows" line where Óbidos still has no published hour), gender-neutral greeting; a job
registered on the dispatcher that claims each send in the log and reports counts; the
placeholder job and its import removed. A booking made after the 06:00 run for the next
day is reminded on the next run only if it is still before the departure — say so in the
spec rather than adding a second cron.

## Acceptance criteria (rough)

- [ ] The 06:00 dispatch sends one reminder per confirmed booking for the next day, in the guest's locale, with the pin; pending holds and cancelled bookings get none
- [ ] A rerun the same morning sends nothing (log claim); a moved booking is reminded for its new date (stub 1)
- [ ] The dispatcher's audit row names the job and its counts; `noop.ts` is gone; CI green

## Out of scope (this feature)

- SMS (D5); an evening-before send; wedding event-day reminders (breakdown).
- Team copy of the reminder — the team sees the day sheet.

## Notes for Define

- Contract performance (Art. 6(1)(b)) — no opt-in, no opt-out line (legal lens).
- Open for Define: whether a same-day booking (after 06:00 for tomorrow) gets a reminder
  at all — the register has no rule; default no, and say it in the confirmation.
- The §2.6 English source line is ungendered; the PT rendering must be too.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/lifecycle-messages/day-before-reminder.md`
and the breakdown. Build the reminder: the confirmed-bookings-on-day query in
`src/lib/bookings.ts`, the PT/EN template in `src/lib/booking-emails.ts` using the
existing facts assembly, the job registered in `src/lib/cron/` replacing `noop.ts`, log
claims through `src/lib/message-log.ts`, tests for the query, the template and the
once-only rule. PR on a `claude/` branch; no local checks — CI is the source of truth.
