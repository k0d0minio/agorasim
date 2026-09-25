# Breakdown: Lifecycle messages — the client's two remaining emails, and a Notifications page that tells the truth

- scope-slug: lifecycle-messages · story: none — re-cut by `/project` 2026-09-18 from the purged epic of the same name (`git log -- .icm/intake/lifecycle-messages`, cut 2026-08-29, purged 2026-09-11)
- initiative: contracted feature ⑤ complete after launch / objective: the three §2.6 messages go out by themselves and the team can see what was sent
- personas: guest, team
- sources: proposal feature ⑤ and the client's own copy in the info PDF §2.6 (welcome, day-before reminder with meeting point, thank-you with the Google review link `https://g.page/r/CWIk-M6uFZMdEBM/review`); D5 (email-first, SMS post-live), D22 (back on the board first), D24 (soft opt-in for the review ask); 2026-09-18 product, data, legal and copy lenses — evidence cited on each stub

## What I understood

Diogo & Rita wrote their three automatic messages themselves. Two of the three ship
today: the welcome/confirmation with the meeting-point pin (in their voice since #97) and
the enquiry acknowledgement. The plumbing the other two need is also on `main`: the
message log records every automatic send exactly once (#77) and the daily dispatcher runs
every morning (#85) — with a placeholder job, because the reminder and the thank-you were
parked for launch. What is left is the two messages, one bookkeeping gap the weather
reschedule opened (a reminder sent for the old date blocks the reminder for the new one),
three shipped sends that bypass the log, and the admin's "Mensagens automáticas" page,
which still shows English fixtures and toggles that do nothing. The review ask is a soft
opt-in with an opt-out line (D24); the reminder is contract performance.

## Where it sits

The guest's post-booking journey (`bookings` → `message_log` → the dispatcher) and the
team's Notifications page in the admin. Pages the stages read: the register's Business
logic → Messages; `.icm/docs/data-protection.md` (the policy's email list changes in stub 3);
`.icm/docs/admin-pt-inventory.md` (stub 4's vocabulary).

## Build order

1. message-log-move-safe — a weather move no longer blocks the new date's reminder; cancellation and moved sends go through the log — depends-on: none
2. day-before-reminder — "tomorrow's confirmed bookings" query, the §2.6 template with the pin, registered on the dispatcher, placeholder removed — depends-on: message-log-move-safe
3. thankyou-review-email — the morning after, with the review link from `site.ts`, opt-out line, policy email list updated — depends-on: day-before-reminder
4. notifications-page-real — the admin page reads the real log, in Portuguese, no fixtures, no fake toggles — depends-on: thankyou-review-email

## Out of scope (whole scope)

- SMS / WhatsApp channel (D5 — wanted, post-live, provider undecided).
- Marketing campaigns or a newsletter — no marketing sender exists; the consent field
  stays display-only until one does.
- An on-site Google-reviews widget — link-first (register open question).
- Event-day reminder and post-event thank-you for weddings off `quotes.event_date` — the
  proposal's §5 "reminders" for car hire; nobody scoped it; logged as a question.
- An evening-before send time — the dispatcher runs 06:00 UTC; the reminder lands the
  morning before. Revisit only if the client asks.
- The PT greeting's gender (`triage/pt-greeting-gender-neutral`) — a tweak to shipped mail;
  the two new templates use the neutral form from the start.
