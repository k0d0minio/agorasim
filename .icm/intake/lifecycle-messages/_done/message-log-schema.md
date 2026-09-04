# Stub: The message log — what was sent, to whom, exactly once

- feature-slug: message-log-schema
- epic: lifecycle-messages
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 6
- sources: 2026-08-29 data lens ("send once, idempotently needs a sent-log… the sent-log must join the retention/erasure scope or it becomes a second place that remembers")

## Problem

Nothing records a send. Idempotent scheduling ("did this booking already get its
reminder?") is impossible, the Notifications page has nothing true to show, and any
log naïvely added would become a second store of guest PII outside the GDPR machinery.

## Proposed change

Migration: `message_log` (kind enum: booking-confirmation, enquiry-ack,
day-before-reminder, thank-you-review, balance-request, balance-reminder,
cancellation…; linkage to booking/enquiry/quote-payment; recipient hash or FK — not a
raw copy of the address; sent-at; provider id; status). Wire into
`lib/retention.ts` anonymisation and `lib/subject-data.ts` export registry from day
one. `sendEmail` callers write the log row.

## Acceptance criteria (rough)

- [ ] Confirmation sends start logging; uniqueness per (kind, subject) enforceable
- [ ] Subject export includes the log; anonymisation covers it
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add the `message_log` schema per
`.icm/intake/lifecycle-messages/message-log-schema.md`: drizzle migration + lib
wrapper so every `sendEmail` call site records kind/linkage/status, uniqueness
suitable for idempotent scheduled sends, and registration in **both**
`web/src/lib/retention.ts` and `web/src/lib/subject-data.ts` (sends are personal
data — the repo's GDPR pattern is deliberate, follow it). Update the existing
confirmation call in `web/src/lib/booking-checkout.ts` to log. PR on a `claude/`
branch; no local checks — CI is the source of truth.
