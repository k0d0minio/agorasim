# Plan: admin-quote-builder

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The message log keys a quote send on the quote** — `web/src/db/schema.ts` (`message_log`),
   one new `web/drizzle/0027_*.sql` + snapshot/journal, `web/src/lib/message-log.ts` (a
   quote-shaped subject beside the booking/departure/enquiry ones) — load the
   `database-migration` capability skill first. The enquiry-shaped unique index stops covering
   `quote-sent`; a quote-shaped one covers it per quote *and* per link (so Reenviar and each new
   version get one row each, a double tap none, a failed row frees the slot). Keep
   `tour_request_id` `on delete cascade` on the row. — done when: `message-log.test.ts` proves
   two versions of one lead each log once, a duplicate insert is refused, a failed row can be
   retried.
2. **The quote domain grows the three writes the card needs** — `web/src/content/terms.ts`
   (`TERMS_VERSION`, ISO of `lastUpdated`, one source), a quote access-token helper beside
   `web/src/lib/cancellation-token.ts` (same HMAC primitive and secret, its own domain prefix —
   no new env var), `web/src/lib/quotes.ts`: `sendQuote` (mint token → `markQuoteSent` →
   cancel the lead's other `sent` quote in the same guarded style → audit row naming both refs),
   `resendQuote` (rotate via `sent → sent`), `newVersionFrom(quoteId)` (copy into a draft, only
   from `sent`), plus the "one draft, one sent per lead" guard. — done when:
   `quote-writes.test.ts` covers each guard, the supersede, the lead stage and the audit rows.
3. **The quote-sent email** — `web/src/lib/booking-emails.ts` (`guestQuoteSentEmail`, PT/EN,
   the shared email layout; date, venue, lines, total, deposit, balance + due date, the
   `/<locale>/orcamento/<token>` link built from the site URL) and the send through the message
   log. — done when: `booking-emails.test.ts` snapshots both languages and asserts the link and
   amounts.
4. **Server actions** — `web/src/app/admin/sales/actions.ts` (or a sibling `quote-actions.ts`):
   create, update, discard, send, resend, new version — `requireAdmin`, euros → cents parsing,
   `validateQuoteInput` errors returned for the form, `revalidatePath` on the lead. — done when:
   the action tests cover auth, a tour lead refused, invalid input shown, a double submit sending
   once.
5. **The Orçamento card** — `web/src/components/admin/lead-quote-card.tsx` (+ a client form for
   the line items with the live total/split), mounted in `web/src/app/admin/sales/[id]/page.tsx`
   only when `lead.kind !== "tour"`; statuses and labels from `.icm/docs/admin-pt-inventory.md`,
   ≥44px targets, ≥12px text (`web/docs/admin-mobile-design-spec.md`). — done when: the card
   renders every state (none / draft / sent / sent + failed email / superseded / deposit paid)
   on the preview at phone width.
6. **Docs + ready** — `web/docs/guia-telemovel.md` gains the card; `security-check.sh`; flip
   ready, `ci-status.sh` GREEN. — done when: GREEN on the full gate and the preview smokes.

## Risks

- The migration touches a unique index the booking dispatcher's idempotency rests on — a wrong
  partial predicate double-sends confirmations. Signal: `message-log.test.ts` booking cases red;
  rehearse on a Neon branch (`db-branch.sh`) before the ready flip.
- `lib/quotes.ts` is `server-only`; the card's live total must use a pure copy of `splitTotal` /
  `balanceDueDate` or a shared pure module, never import the server file into a client
  component. Signal: build error on `server-only`.
- The link 404s until stub 3 ships (accepted, spec Out of scope). A Reenviar or new version
  before stub 3 still kills the previous link — correct, and invisible until the page exists.
- Two phones sending the same draft: the `WHERE status = 'draft'` guard makes one lose; the
  loser must see "já enviado", not an error page.
