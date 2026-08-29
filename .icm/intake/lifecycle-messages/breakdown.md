# Breakdown: Lifecycle messages — the client's three emails, plus the plumbing they need

- epic-slug: lifecycle-messages
- sources: proposal feature ⑤ (email + SMS; D5 defers SMS post-live); info PDF §2.6 (client-written copy: welcome, day-before reminder with meeting point, thank-you with Google review link `https://g.page/r/CWIk-M6uFZMdEBM/review`); 2026-08-29 data + copy lenses (only the confirmation email exists; one weekly cron; notifications admin shows "enabled: true" fictions)

## What I understood

Diogo & Rita wrote their three automatic messages themselves. Only the booking
confirmation exists; the enquiry form sends nothing to anyone; there is no scheduler
(one weekly retention cron) and no record of what was sent. The Notifications admin
page previews "Tour reminder — enabled" — a fiction the owners will believe. The
build: a sent-log table (inside GDPR retention/erasure scope — sends are PII), a
daily dispatcher route that fans out due jobs (also carries quote-flow's T−14), the
three messages in the client's own voice, and the Notifications page wired to the
truth. SMS stays a register-wanted feature until post-live.

## Build order

1. message-log-schema — the sent-log, in retention scope — depends-on: none
2. daily-dispatcher — one daily cron route fanning out due jobs — depends-on: message-log-schema
3. enquiry-ack-email — ack for the enquiry form + client voice in the confirmation — depends-on: message-log-schema
4. day-before-reminder — §2.6 reminder with meeting point + pin — depends-on: daily-dispatcher
5. thankyou-review-email — §2.6 thank-you with the review link — depends-on: daily-dispatcher
6. notifications-page-real — the admin page reads the log, not fixtures — depends-on: day-before-reminder

## Out of scope (whole epic)

- SMS / WhatsApp channel (D5 — wanted, post-live, provider undecided).
- Marketing campaigns/newsletter — the Email studio stays a preview by Jamie's choice
  (2026-08-29 round 1); `email_campaign_drafts` stays.
- On-site Google-reviews widget — link-first now; widget is an open register question.
