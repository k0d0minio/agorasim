# Plan: thankyou-review-email

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Schema and migration** — `web/src/db/schema.ts` (`email_opt_outs` table: address hash,
   recorded-at, via `page|one-click`; `bookings.no_show_at` nullable), one new numbered file
   under `web/drizzle/` with its journal entry (load the `database-migration` skill) — done
   when: `check-migrations.sh` is clean and the migration is additive only.
2. **Opt-out core** — a new `web/src/lib/email-opt-out.ts`: HMAC hash of the normalised
   address under `EMAIL_OPT_OUT_SECRET`, link token sign/verify (no address or booking id in
   the clear; domain-separated from the hash), `isOptedOut(email)`, `recordOptOut(token, via)`
   (insert-if-missing + withdraw `marketingConsent` on every `tour_requests` row with that
   address + audit entry without the address); `.env.example` gains the secret — done when:
   unit tests cover sign/verify/forgery, idempotence, consent withdrawal, the unset-secret
   fail-closed path.
3. **Email plumbing and template** — `site.ts` `reviews.google`; `lib/email.ts` `headers`
   passthrough on `EmailMessage`; thank-you copy in `content/emails.ts` (PT/EN per the
   spec, gender-neutral PT); `guestThankYouEmail` in `lib/booking-emails.ts` (HTML + text,
   review button, Instagram line, opt-out footer, List-Unsubscribe + List-Unsubscribe-Post
   headers) — done when: template tests render both locales with the link, the handle and
   the headers.
4. **The job** — `lib/bookings.ts` query (confirmed, `no_show_at is null`, date in
   {yesterday, day before} Lisbon, joined to the enquiry); `lib/cron/thank-you-review.ts`
   modelled on `day-before-reminder.ts` (per-day passes sealed off, `sendLoggedEmail` with
   `kind: "thank-you-review"` and no `subjectDate`, `isOptedOut` before the claim, tally
   sent/already/skipped/opted out/failed, fail closed without the secret); registered in
   `lib/cron/jobs.ts` — done when: tests cover the window, the filters, the opt-out skip and
   the once-only rule.
5. **Opt-out surfaces** — `app/[locale]/reserva/deixar-de-receber/[token]/page.tsx`
   (`force-dynamic`, `noindex`, GET reads only, Server Action POST, done / invalid states in
   both locales) and a POST-only route handler under `app/api/` for RFC 8058 one-click —
   done when: a GET changes nothing, a POST records `page` / `one-click`, a forged token is
   the neutral page / a non-200 without detail.
6. **No-show mark** — admin Server Actions in `app/admin/actions.ts` (mark / clear,
   `requireAdmin`, confirmed + dated ≤ today Lisbon, audited, `revalidatePath`); the booking
   panel on `app/admin/sales/[id]` shows "Marcar falta" / "Faltou" + "Retirar falta" + the
   hint — done when: the authorization test covers both actions and the thank-you query
   excludes a marked booking.
7. **Art. 15 and policy** — `lib/subject-data.ts` reports the opt-out; `content/privacy.ts`
   (both locales: lawful basis exception, Resend paragraph, retention/rights line;
   `marketing.label` untouched); `.icm/docs/data-protection.md` (Resend row, open item 5,
   erasure note, never-rotate rule) — done when: `MARKETING_CONSENT_VERSION` is unchanged and
   the PT/EN sections mirror each other.
8. **Ready flip** — `format.sh` / `lint.sh` / `security-check.sh`, flip ready, push,
   `ci-status.sh` → GREEN.

## Risks

- `EMAIL_OPT_OUT_SECRET` missing on a preview → the job reports "not run" and the opt-out page
  errors neutrally; the smoke needs the variable set in Preview first.
- The one-click route and the page share token verification; a drift between them shows as a
  test where one accepts what the other rejects — keep one verifier.
- A migration numbered against a stale `main` collides with another run's — renumber on the
  base merge, never edit a merged migration.
- The PT copy is a translation of the client's EN; a gendered word slipping in (conhecê-lo,
  obrigada/o towards the guest) is the signal to re-read against `bookingEmails.guest.lead`.
