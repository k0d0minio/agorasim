# Build notes: quote-refunds

- commits: 5d93ff7 (schema + migration 0029) · 8a3d35a (refund library, email, tests) · d6fa61e (webhook) · cd19c95 (admin card)
- ci: GREEN on e55cefe — full gate (Vercel preview) and the advisory Quality job both pass

## What changed

- `web/src/db/schema.ts` + `web/drizzle/0029_quote_refunds.sql`: `quote-refunded` appended to `message_kind`; `message_log.quote_payment_id` (FK, cascade) and `refunded_total_cents`; a new partial unique index `message_log_quote_refund_key` on (kind, recipient, quote_payment_id, refunded_total_cents); `message_log_quote_receipt_key` narrowed with `quote_payment_id is null` so refund rows never take a receipt's slot. Generated with `drizzle-kit generate`; the enum add hand-tuned to `IF NOT EXISTS` like 0026. Applied to `run/quote-refunds` and `verify-migrations.ts` → all 30 entries applied.
- `web/src/lib/quotes.ts`: pure `instalmentRefundableCents`, `instalmentStatusAfterRefund`, `depositRefundedInFull`; `getPaymentByCharge`; `recordPaymentRefund` reworked from "add and always write refunded" (it had no caller) to set-to-charge-truth under a compare-and-set on the amount read, status by the pure rule; `recordPaymentRefundFee`; `cancelQuoteAndOpenInstalments`.
- `web/src/lib/booking-refund.ts`: `latestRefundId` exported; the Stripe half of `returnApplicationFee` extracted as `topUpApplicationFee` and shared. The tour path's keys, messages and return values are unchanged.
- `web/src/lib/quote-refund.ts` (new): `refundQuotePayment` (admin), `syncQuotePaymentRefundFromStripe` (webhook), `cancelHeldQuote`, all ending in one `settleInstalmentRefund` — row, fee top-up, audit, optional cancellation, the couple's notice.
- `web/src/lib/message-log.ts`: the `quote-refunded` subject shape.
- `web/src/content/emails.ts` + `web/src/lib/booking-emails.ts`: `quoteRefund` copy (PT/EN) and `guestQuoteRefundEmail`.
- `web/src/lib/audit.ts` + `admin-format.ts`: `quote.payment_refunded`, `quote.cancelled` with labels; `EVENT_CANCEL_CONFIRMATION`.
- `web/src/app/api/stripe/webhook/route.ts`: on `unknown-charge` from the booking reconciler, the instalment reconciler runs before the alert; the alert now reads "matches no booking or quote instalment".
- `web/src/app/admin/sales/actions.ts`, `lib/form-schemas.ts`, `app/admin/sales/[id]/page.tsx`, `components/admin/lead-quote-card.tsx`, `components/admin/quote-refund-dialogs.tsx` (new): Reembolsar per refundable instalment, refunded amounts on the rows, the "event still held" warning with Cancelar evento.

## Acceptance criteria status

- [x] Admin refund, full or partial, on the owning account, row = Stripe's figures — `refundQuotePayment`; the fee column is Stripe's `amount_refunded` read back after the top-up (`quote-refund.test.ts`)
- [x] Fee proportional, topped up, whole fee on a full refund — `proportionalFeeRefundCents` + `topUpApplicationFee`; tests for half, second half, a Stripe rounding cent, and the dashboard's kept fee
- [x] One Stripe refund per submission; refusals write nothing — idempotency key `quote-refund:<payment>:<refunded so far>:<amount>`; refusal cases tested; plain PT messages in the action
- [x] Partial stays `paid` with the amount shown; full → `refunded` — `instalmentStatusAfterRefund` (quotes.test.ts) and the card row
- [x] Cancelar também o evento — default follows the amount until touched; cancel after the refund succeeds, open instalments written off; refused refund cancels nothing (tested). The quote link's "no longer valid" page is #122's existing behaviour for a cancelled quote — not re-tested here
- [x] Dashboard refund reaches `quote_payments`; redelivery changes nothing; a lower total follows down without walking status back; tour path untouched (route.test.ts unchanged; route.quote.test.ts routing cases)
- [x] "Event still held" warning + Cancelar evento (typed `CANCELAR`)
- [x] One `quote-refunded` email per refund from either door; echo and redelivery send nothing; a second partial sends again (message-log.test.ts key cases, quote-refund.test.ts); PT and EN content (booking-emails.test.ts)
- [x] Audit rows per refund (`quote.payment_refunded`, via admin/stripe) and per cancellation (`quote.cancelled`)
- [x] Tests written for all the above; CI green — Quality (advisory) passed on the draft head and on e55cefe

## Notes for Release

- **Audit rows sit on the lead, not a quote entity.** The spec says "on the quote"; the house convention for every `quote.*` action is `entityType: "tour_request"`, `entityId: <lead>` with `quoteRef` in `after`, so the lead's history shows them. Followed the convention (decisions.md D-4).
- **Echo race, accepted.** If the webhook echo of an admin refund lands between Stripe accepting the refund and the admin path's row write, the webhook wins the compare-and-set and sends the notice before the admin path cancels the event: the couple's email would say "still booked" although the box was ticked. The cancellation itself still happens (the admin path honours it on a lost claim). Window is the few hundred ms between two server calls; parked no stub.
- **Open Checkout sessions are not expired on cancel.** A balance session already open in a couple's tab can still be paid after the quote is cancelled; `recordQuotePayment` already alerts on "paid on a cancelled quote". Not in the spec; not added.
- The preview's build migrates its own Neon branch (`project-rules.md` → The factory), so the preview carries 0029.
- `next build` type-checks the tests (Learned rule); the new test files were written with that in mind but have not been compiled locally.

Context budget: read beyond the Inputs — `quote-checkout.ts`, `booking-emails.ts`, `message-log.ts` and their tests, to follow the shipped patterns this spec names as the model.

## Release

- gate: Ready to merge ticked — merge authorised
- ci: GREEN on 6113e6e before the Release pushes; re-read after the last push (ci-status.sh)
- reviews: code high — 10 findings: 2 fixed in-ticket (the refund dialog now remounts on the row's refunded total so it reopens; the "event still held" warning names the balance only when one is still owed), 8 parked · security `security-check.sh --branch --audit`: OK (pnpm audit clean) + /security-review — no finding at the reporting bar · /production-readiness n/a — the skill is not installed in this session; the diff's DB (migration 0029, applied to run/quote-refunds), payments and env surfaces were covered by the code review, `check-migrations.sh` and `env.sh audit --changed` · readiness `env.sh audit --changed`: OK
- parked: quote-refund-echo-race.md, quote-cancel-expire-open-sessions.md, quote-refund-admin-reads-charge.md, refund-idempotency-cached-declines.md, quote-refund-guard-post-refund-writes.md, refund-paths-dedupe.md (the last groups three de-duplication findings)
- migrations: skip — check-migrations.sh reads SKIP (drizzle journal; 0029 is the only new entry after main's merge, no conflict)
- learned: none from retrospective.sh (its one candidate, the STRIPE_WEBHOOK_SECRET scope gap, was fixed at its source in .env.example and cannot recur); 2 from FAILURE.md via close-out
- docs: .icm/docs/data-protection.md (Resend row names the quote-refunded notice) · announce: deferred to promotion

Context budget: Release read the full branch diff for the reviews, and #149's quotes.ts hunks after main's merge.
