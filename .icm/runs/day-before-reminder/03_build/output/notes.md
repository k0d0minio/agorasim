# Build notes: day-before-reminder

- commits: 594850f feat (query, copy, template, job, privacy, tests) · 50a903d chore (notes) · 133eb73 fix (test: escaped apostrophe in HTML) · 8b6f877 + bc770c4 merges of origin/main and origin/uat
- ci: GREEN — cheap tier on bc770c4, full gate on the post-flip head

## What changed

- `web/src/lib/bookings.ts`: `remindableOnSql(date)` (date = D, `status = 'confirmed'`, slot morning/afternoon — deliberately not `holdsCapacitySql`, so pending holds are out and cash bookings are in) and `confirmedBookingsOn(date)`, left-joined to `tour_requests` for name + email, returning only what the reminder renders (no amounts, no payment method). No schema change.
- `web/src/content/emails.ts`: `bookingEmails.reminder` — `tomorrow` / `today` subject, banner, lead, signoff; shared greeting, details heading, the Óbidos `departureTime` note with `{diogoPhone}`/`{ritaPhone}`, change note, footer. PT ungendered.
- `web/src/lib/booking-emails.ts`: `guestReminderEmail(ReminderEmailFacts)` — HTML + text, the confirmation's labels, pin linked in HTML and bare in text, Óbidos note only when `departureTimeFollows`, no total, no cancel link, no withdrawal footer.
- `web/src/lib/cron/day-before-reminder.ts`: `reminderDays(now)` (Lisbon `todayKey` + one calendar day), `dayBeforeReminder(now)` — tomorrow pass then today catch-up, both claiming `day-before-reminder` keyed on `(booking, booking.date)`; per-booking try/catch; summary `tomorrow D: n sent, n already reminded, n skipped, n failed · today D: …`; `register()` at module scope.
- `web/src/lib/cron/noop.ts`: deleted; `web/src/app/api/cron/dispatch/route.ts` imports the reminder job instead.
- `web/src/content/privacy.ts`: PT/EN legal-basis and Resend paragraphs name the day-before reminder; `lastUpdated` → 24 September 2026 (the policy says it bumps the date on any change).
- Tests: `bookings.test.ts` (filter rendered via `PgDialect`), `booking-emails.test.ts` (`guestReminderEmail`, 12 cases), `cron/day-before-reminder.test.ts` (Lisbon days incl. DST/year edge, once-only, catch-up, move, retry, skip, isolation, summary).

## Acceptance criteria status

- [x] Tomorrow's confirmed bookings, Stripe and cash, in the booking's locale, with the pin; holds/expired/cancelled/refunded excluded — `remindableOnSql` + job test + filter test.
- [x] "Today" variant to today's unreminded confirmed bookings, nothing to yesterday's — catch-up pass under the same key; job test.
- [x] Rerun sends nothing; moved booking reminded for new date; failed send retried — date-bound claim; job tests.
- [x] PT gender-neutral; Óbidos line with both numbers, not on Rural Saloia; no money, no cancel link — template tests.
- [x] No enquiry / no email → skipped and counted, never claimed — job test.
- [x] Audit row names `day-before-reminder` with per-variant counts (the dispatcher writes `name: summary` into `cron.dispatch` unchanged); `noop.ts` and import gone.
- [x] Privacy policy PT/EN lists name the reminder.
- [x] Unit tests written as listed; CI green on the full gate.

## Notes for Release

- The dispatcher runs at 06:00 UTC: 06:00 Lisbon in winter, 07:00 in summer — before both departures, so the catch-up is always sent before the tour.
- `bookingsBetween` (the day sheet) is unchanged; the reminder has its own query on purpose (holds excluded).
- Privacy policy text changed (and its date): Release should check `.icm/docs/data-protection.md` still matches the policy's email list.
- `env.sh audit --changed` reports `GAPS 1`: `CRON_SECRET` declared in `web/.env.example` but missing on Vercel/agorasim. Not this branch's — its commits never touch `.env.example`; the audit diffs against `main`, and the key comes with the `uat` branch. It matters to this feature all the same: the dispatch route refuses to run without `CRON_SECRET` (503), so **no reminder goes out in an environment where it is unset**. The operator sets the value in Vercel (all targets the example declares); the value is never an agent's.
- Build hit one CI red (a test asserting a raw apostrophe in the HTML part) — `03_build/output/error.log`, resolved in 133eb73.
- Preview smoke: the dispatcher is cron-only and `CRON_SECRET`-guarded; the reminder can be seen by calling `/api/cron/dispatch` with the preview's `CRON_SECRET` against a preview database holding a confirmed booking for tomorrow, or by reading the rendered copy in the tests.

## Release

- gate: Ready to merge ticked — merge authorised
- ci: GREEN on 017bcbb (ci-status.sh, full gate); re-read after the last push before the merge
- reviews: code medium — 9 findings: 4 fixed in facadba (tomorrow/today passes isolated so a failed read cannot cost the catch-up; anonymised enquiries skipped, not mailed; privacy legal basis covers phone bookings; data-protection.md synced), 1 resolved by those (job name on a thrown run), 3 parked, 1 kept (the `full_day` map is the type narrowing) · security security-check.sh --branch --audit: OK (gitleaks absent — built-in patterns only) · /security-review n/a — no auth, payments or route policy touched; PII read is name + email for a send the policy now names · /production-readiness n/a — not installed in this repo · readiness env.sh audit --changed: GAPS 2 — CRON_SECRET and STRIPE_WEBHOOK_SECRET missing on the development target only (present for production and preview); waived by the operator: "the cron secret is in vercel, just release"
- parked: booking-logistics-facts-shared.md
- migrations: skip — none of this run's own
- learned: 1 rule appended to _shared/project-rules.md
- docs: .icm/docs/data-protection.md (Resend row, lawful-basis note) · announce: deferred to promotion
- conflict: .icm/docs/data-protection.md on merging origin/uat (017bcbb) — uat's quote-page rows kept, the reminder re-added to the Resend row
