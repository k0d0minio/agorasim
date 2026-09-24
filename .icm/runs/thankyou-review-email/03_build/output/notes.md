# Build notes: thankyou-review-email

- commits: 5dd402b schema + migration · 731cef6 opt-out list, tokens, audit actions · 7085d22 template, review link, List-Unsubscribe · a3a50cc the dispatcher job · ab91ada opt-out page + one-click endpoint · 3b305d9 no-show mark · cf799b7 policy, register, Art. 15, backup, env
- ci: see status.md (settled by ci-status.sh after the ready flip)

## What changed

- `web/src/db/schema.ts`, `web/drizzle/0029_thank_you_opt_out_no_show.sql`: `email_opt_outs` (HMAC address hash PK, `via` enum `page|one-click`, `created_at`) and `bookings.no_show_at`. Additive only; applied cleanly on the run's Neon branch `run/thankyou-review-email`.
- `web/src/lib/email-opt-out-token.ts`: the address hash and the signed link token under `EMAIL_OPT_OUT_SECRET` (domain-separated HMACs, Web Crypto, stateless — any code holding the address can mint its link); paths for the page and the one-click endpoint.
- `web/src/lib/email-opt-out.ts`: `isOptedOut`, `isAddressHashOptedOut`, `optedOutAt`, `recordOptOut` (insert-if-missing, withdraws `marketingConsent` on every enquiry with that address, audits `email.opted_out` with no address or hash).
- `web/src/lib/audit.ts`, `web/src/lib/admin-format.ts`: actions `booking.no_show_marked`, `booking.no_show_cleared`, `email.opted_out`; entity type `email_opt_out`; PT labels.
- `web/src/content/site.ts`: `reviews.google`. `web/src/content/emails.ts`: `thankYou` copy (EN = client's §2.6 lightly mended; PT ungendered towards the guest). `web/src/lib/email-layout.ts`: `emailParagraphWithLink`. `web/src/lib/booking-emails.ts`: `guestThankYouEmail` (review button, Instagram line linked, opt-out footer line, `List-Unsubscribe` + `List-Unsubscribe-Post`). `web/src/lib/email.ts`: `headers` passthrough to Resend.
- `web/src/lib/bookings.ts`: `thankableOnSql` (the reminder's rule + `no_show_at is null`) and `bookingsToThankOn`.
- `web/src/lib/cron/thank-you-review.ts`: the job — yesterday + the day before (Lisbon), `isOptedOut` before the claim, `thank-you-review` kind with no `subjectDate` (once per booking ever), tally sent / already / skipped / opted out / failed, fails closed without the secret; registered via `app/api/cron/dispatch/route.ts`.
- `web/src/app/[locale]/reserva/deixar-de-receber/[token]/page.tsx` + `actions.ts`, `web/src/components/opt-out-panel.tsx`, `web/src/content/opt-out.ts`: the confirm page (force-dynamic, noindex, GET reads only, Server Action POST, done / invalid states in both locales, throttled).
- `web/src/app/api/email/opt-out/[token]/route.ts`: RFC 8058 one-click, POST only (200 / 400 / 429 / 503, no detail).
- `web/src/lib/booking-no-show.ts`, `web/src/app/admin/sales/actions.ts` (`setBookingNoShow`), `web/src/components/admin/no-show-toggle.tsx`, `web/src/app/admin/sales/[id]/page.tsx`: "Marcar falta" / "Faltou" / "Retirar falta" with the hint; `web/src/lib/form-schemas.ts` `bookingNoShowSchema`; `web/src/lib/rate-limit.ts` `OPT_OUT_RATE_LIMIT`.
- `web/src/lib/subject-data.ts`: the Art. 15 export reports `emailOptOut` (opted-out since / not / unavailable).
- `web/src/lib/backup.ts`: `email_opt_outs` added to `BACKUP_TABLES` — the backup test requires every schema table, and a restore that lost the list would re-subscribe everyone.
- `web/src/content/privacy.ts` (PT + EN): lawful-basis exception, what-we-collect, retention (hashed opt-out kept without limit), Resend paragraph, rights line, two new `legalOpenItems`. `privacyContent.marketing.label` untouched → `MARKETING_CONSENT_VERSION` unchanged.
- `.icm/docs/data-protection.md`: Resend row, open item 5, the erasure exception (`email_opt_outs`), the never-rotate rule, the Art. 15 line.
- `web/.env.example`: `EMAIL_OPT_OUT_SECRET` (with an explicit `[production,preview,development]` line — see error.log); `web/vitest.config.mts`: the test secret.

## Acceptance criteria status

- [x] One thank-you per confirmed, non-no-show booking dated yesterday, Stripe and cash alike, in the booking's locale, with the review link, Instagram line and opt-out line — `thankableOnSql` + `thank-you-review.ts`; tests in `bookings.test.ts`, `cron/thank-you-review.test.ts`, `booking-emails.test.ts`
- [x] Day-before catch-up, `already` count, rerun sends nothing, moved booking thanked only after its new date — `thank-you-review.test.ts`
- [x] Opted-out address skipped (no log row); no-enquiry / no-email skipped; booking mail untouched (the check lives only in the thank-you job) — `thank-you-review.test.ts`
- [x] Opening the link records nothing; the button records, withdraws consent, done state; idempotent; forged token → neutral page — page + `actions.ts`; tests in `route.test.ts` (button) and `email-opt-out.test.ts`
- [x] One-click POST records `one-click` and answers 200; both headers on the thank-you — `route.test.ts`, `booking-emails.test.ts`
- [x] No address in the clear; survives erasure and retention (no FK, neither touches the table); Art. 15 reports it; no secret → job sends nothing, summary + tracker — `email-opt-out*.test.ts`, `subject-data.test.ts`, `thank-you-review.test.ts`
- [x] Sales detail: mark a past / same-day confirmed booking "Faltou", clear it; both audited; marked booking not thanked — `booking-no-show.ts`, `actions.test.ts`, `booking-no-show.test.ts`, `thankableOnSql`
- [x] Dispatcher audit row names `thank-you-review` with the five counts — the job's summary, which the dispatcher writes into its `cron.dispatch` row
- [x] Privacy policy PT + EN and `data-protection.md` in this PR; `MARKETING_CONSENT_VERSION` unchanged
- [x] Unit tests for the window, the filter, the opt-out skip, once-only, token sign/verify/forgery, the opt-out action, both locales, the no-show actions' authorization (structural `authorization.test.ts` + behavioural `actions.test.ts`) — CI green to be confirmed by `ci-status.sh`

## Notes for Release

- **Spec deviation, small:** the no-show action does **not** call `revalidatePath` — the spec said "like the other Sales-board writes", but those call it only to refresh the public calendar's occupancy, and the mark renders on dynamic admin pages only (the rule at the top of `app/admin/actions.ts`). The toggle calls `router.refresh()`.
- **Beyond `touches:`** — `web/src/lib/backup.ts` (the backup registry test requires every table), `web/src/lib/audit.ts` / `admin-format.ts` (the audit actions), `web/src/lib/rate-limit.ts`, `web/src/lib/email-layout.ts`, `web/src/lib/form-schemas.ts`, `web/src/components/**`, `web/src/content/opt-out.ts`, `web/.env.example`, `web/vitest.config.mts`.
- **The Art. 15 export JSON gains a top-level `emailOptOut` field.**
- **Locale:** the thank-you goes out in `bookings.locale` — "the language the guest bought in", the one every booking email uses — where the spec's criterion says "the enquiry's locale". Same value in practice (the checkout writes both); the reminder made the same choice.
- **Operator before the smoke:** `EMAIL_OPT_OUT_SECRET` must exist in Vercel (Production, Preview, development/uat) — without it the job sends nothing and the opt-out page shows the invalid-link panel. `env.sh audit --changed` shows it as the one GAP of this branch's own; the other four GAPs it lists (`RESEND_API_KEY`, `BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS`, `CRON_SECRET` missing on the development target) pre-date this branch and are pulled in only because files that read them changed.
- **Template change parked:** `triage/template-change-env-audit-empty-targets.md` — `env.sh` audit collapses an empty targets field and warns "no note yet" for keys that have notes.
- The migration is forward-only and additive; a code revert tolerates it.
- Context budget: Build read `lib/cron/day-before-reminder.ts` and its test, `lib/message-log.ts` (the claim keys), `app/admin/actions.test.ts` (the fake db), `lib/backup.ts`, the cancel page + panel as the page template — all to follow the house patterns exactly.
