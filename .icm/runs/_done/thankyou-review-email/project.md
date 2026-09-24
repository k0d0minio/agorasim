# Project: thankyou-review-email

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/lifecycle-messages/thankyou-review-email.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/content/site.ts, web/src/content/emails.ts, web/src/lib/booking-emails.ts, web/src/lib/email.ts, web/src/lib/bookings.ts, web/src/lib/cron, web/src/lib/subject-data.ts, web/src/db/schema.ts, web/drizzle, web/src/app/[locale]/reserva, web/src/app/api, web/src/app/admin/sales, web/src/app/admin/actions.ts, web/src/content/privacy.ts, .icm/docs/data-protection.md
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- D24: the thank-you is soft opt-in — one send per booking, opt-out line, policy updated in
  the same PR. D5: email only, no SMS.
- The opt-out never suppresses booking mail (confirmation, reminder, cancellation, moved).
- `email_opt_outs` stores no plaintext address; `EMAIL_OPT_OUT_SECRET` is never rotated.
- The no-show mark changes nothing but the thank-you — no money, status or capacity effect.
- `privacyContent.marketing.label` untouched → `MARKETING_CONSENT_VERSION` unchanged.
- Admin strings from `.icm/docs/admin-pt-inventory.md` ("falta").

## Context budget

- Define read `db/schema.ts` (enums, `message_log` indexes), `lib/message-log.ts`,
  `lib/cron/*`, `content/privacy.ts` excerpts and the info PDF §2.6 — needed to settle the
  opt-out storage, the catch-up window and the no-show question.
