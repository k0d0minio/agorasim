# Spec: The day-before reminder — "Tomorrow is the big day", with the pin

- slug: day-before-reminder
- personas: guest
- touches: web/src/lib/bookings.ts, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/lib/cron, web/src/app/api/cron/dispatch/route.ts, web/src/content/privacy.ts
- complexity: standard

## Problem

Diogo & Rita wrote three automatic messages (info PDF §2.6); the second — "Olá, Tomorrow is
the big day, here is some information about the meeting point" — is never sent. The daily
dispatcher (#85) runs a placeholder job every morning, and the only query that lists
bookings by date (`bookingsBetween`) returns name and party only and includes unpaid holds.
Guests on Óbidos were told "the exact departure time follows by email", and phone/cash
bookings get no email at all today, so the day before is when a guest most needs the pin.
This advances contracted feature ⑤ (proposal §2.6): the objective is that the reminder goes
out by itself the morning before, recorded exactly once in the message log.

## Proposed change

- **Who is reminded.** A new query returns the **confirmed** bookings on a given day
  (`status = 'confirmed'` only — pending holds, expired, cancelled and refunded rows are
  excluded), for both payment methods (Stripe and cash/manual), on the two operational
  departures, joined to the enquiry for the guest's name and email, and carrying what the
  template needs: booking id and ref, enquiry id, locale, date, tour slug, slot, mode, party
  bands, add-ons.
- **When.** A job registered on the daily dispatcher (06:00 UTC, `vercel.json` unchanged)
  computes "today" and "tomorrow" as calendar days in `Europe/Lisbon`
  (`BUSINESS_TIME_ZONE`) from the run's clock, then:
  1. **Tomorrow** — sends the reminder to every confirmed booking dated tomorrow.
  2. **Same-morning catch-up** — sends a "today" variant to every confirmed booking dated
     today that has no reminder yet. This covers a booking made, or weather-moved, into
     tomorrow after yesterday's run. Both variants are the same `day-before-reminder` kind
     keyed on `(booking, booking.date)` (`DATE_BOUND_KINDS`), so a booking reminded yesterday
     loses the claim today and gets nothing; a booking moved to a new date is reminded for
     the new date. Both departures (10:00 / 14:00 Lisbon) leave after the run in every
     season. A booking created on the morning of its own tour after the run gets no reminder
     (the next run is after the departure) — accepted, not handled.
- **Once only.** Every send goes through `sendLoggedEmail` with
  `{ kind: "day-before-reminder", recipient: "guest", bookingId, subjectDate: booking.date,
  tourRequestId }`. A rerun the same morning sends nothing. A failed send releases its claim
  and is retried by the next run (as the "today" variant if that is still before the tour).
  A booking with no enquiry row or no email is skipped and counted, never an error.
- **The message** (new copy in `content/emails.ts`, rendered in `lib/booking-emails.ts` in
  HTML + plain text, in the booking's locale, the same branded layout as the confirmation):
  - Subject/banner: "Amanhã é o grande dia" / "Tomorrow is the big day" (tomorrow variant);
    "Hoje é o grande dia" / "Today is the big day" (catch-up variant) — with tour and date.
  - Greeting and lead in the client's §2.6 voice, gender-neutral in PT (no agreeing
    adjective or pronoun — the rule noted on `bookingEmails.guest.lead`): "Olá {name},
    amanhã é o grande dia! Aqui fica a informação sobre o ponto de encontro." and the EN
    equivalent.
  - Details: reference, experience (tour + mode), date, departure (`departureLabel`),
    meeting point (address linked to the maps pin; the pin URL in the text part), party,
    add-ons (row omitted when none). A tour with no entry in `meetingPoints` renders no
    meeting-point row — never a wrong one.
  - **Óbidos** (`departureTimeFollowsByEmail`): one extra line — "If you haven't had the
    exact departure time from us yet, call or message Diogo or Rita" with both numbers
    (`site.contacts`). Rural Saloia shows its clock time and no such line.
  - Contacts footer as on the confirmation. **No money line** (cash and Stripe read the
    same), **no cancellation link** (the 48-hour free-cancellation window has closed by
    the day before), no opt-out line (contract performance, Art. 6(1)(b), D24).
- **Reporting.** The job's name is `day-before-reminder`; its summary names the counts per
  variant — sent, already reminded (duplicate), skipped, failed — and lands in the
  dispatcher's `cron.dispatch` audit row unchanged in shape. A failed send is logged by ref
  (no address).
- **Placeholder gone.** `lib/cron/noop.ts` is deleted and the dispatch route imports the
  reminder job module instead.
- **Privacy policy.** The PT and EN lists of transactional emails in `content/privacy.ts`
  (legal basis paragraph and the Resend processor paragraph) name the day-before reminder
  beside the confirmation and cancellation.

## Acceptance criteria

- [ ] The 06:00 dispatch sends one reminder per confirmed booking dated tomorrow (Europe/Lisbon), Stripe and cash alike, in the booking's locale, with the meeting point linked to its pin; pending holds, expired, cancelled and refunded bookings get none
- [ ] The same run sends the "today" variant to a confirmed booking dated today that has no reminder row, and nothing to one already reminded yesterday
- [ ] A rerun the same morning sends nothing (log claim); a booking moved to a new date is reminded for the new date; a failed send is retried on the next run
- [ ] The PT copy is gender-neutral; the Óbidos reminder carries the "call or message Diogo or Rita" line with both numbers and Rural Saloia's does not; no money line and no cancellation link in either locale
- [ ] A booking with no enquiry or no email is skipped and counted without failing the job
- [ ] The dispatcher's audit row names `day-before-reminder` and its sent / already reminded / skipped / failed counts per variant; `noop.ts` and its import are gone
- [ ] The privacy policy's PT and EN email lists name the day-before reminder
- [ ] Unit tests cover the query's status filter, the Lisbon today/tomorrow computation, both template variants in PT and EN (Óbidos and Rural Saloia), and the once-only rule; CI green

## Out of scope

- SMS (D5); an evening-before send time; a second cron (the catch-up rides the 06:00 run).
- A team copy of the reminder — the team sees the day sheet.
- Wedding / event-day reminders off `quotes.event_date`.
- A confirmation email for cash/manual bookings — they are reminded, not confirmed, by this change.
- Changing the confirmation's copy or the dispatcher's schedule.
- Showing reminder rows in the admin — `notifications-page-real` (stub 4).

## Open questions

- none. Settled with the operator 2026-09-24: same-morning catch-up for late bookings and moves (instead of the stub's "no reminder" default), the Óbidos "call or message us" line, no money line.
