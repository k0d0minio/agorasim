# Plan: balance-scheduler

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define), executed
pass by pass, and rewritten when reality disagrees with it — never left describing a plan that
was abandoned.

## Passes

1. **The log shape** — `web/src/lib/message-log.ts`: move `balance-request` and
   `balance-reminder` out of the catch-all subject branch into the quote-keyed receipt shape
   (extend `QUOTE_RECEIPT_KINDS`, or a sibling const on the same branch), so a claim names
   `quoteId` and lands under `message_log_quote_receipt_key` (kind, recipient, quote_id). No
   migration — the index predicate already covers any kind with `quote_id` set and
   `quote_sent_at`/`quote_payment_id` null. Add a read `hasClaim(kind, quoteId, recipient)` (a
   non-failed row exists) and a read of a claim's `sent` timestamp for the 3-day gap — done when:
   `tsc` accepts `{ kind: "balance-request", recipient: "guest", quoteId }` and rejects it without
   `quoteId`.
2. **The queries and the rotation** — `web/src/lib/quotes.ts`: keep `listQuotesDueForBalance`
   (pass 1's set); add `listQuotesForBalanceReminder({ now })` (`deposit_paid`, balance
   `pending|issued`, today ≤ event ≤ today+7) and `listUnpaidBalancesDue({ now })` (`deposit_paid`,
   balance not `paid|cancelled|refunded`, event ≤ today+3, past events included) for the panel,
   each joined to the lead (name, email, anonymised flag); add
   `rotateQuoteLink(quoteId, { expectedDigest, digest, now })` — an UPDATE of `access_token_hash`
   (+ `updated_at`) only, `WHERE id = … AND status = 'deposit_paid' AND access_token_hash =
   expectedDigest`, returning the row or `null` (the swap loser). `quote-token.ts` already has
   `issueQuoteToken` / `quotePath`; nothing new there unless a helper for the absolute URL is
   missing — done when: the three windows' edge dates select exactly as the spec says in unit
   tests.
3. **The emails** — `web/src/content/emails.ts` (PT/EN copy for request and reminder, the
   "this link replaces any earlier one" line, the contacts) and `web/src/lib/booking-emails.ts`
   (`guestBalanceRequestEmail(facts)`, one builder with a `request | reminder` switch, in the
   shape of `guestQuoteSentEmail`) — done when: snapshot-style tests show both kinds in both
   locales carrying ref, event date, venue, balance amount, due date and the link.
4. **The job** — `web/src/lib/cron/balance-scheduler.ts`, registered at module scope like
   `day-before-reminder.ts`, and imported in `web/src/app/api/cron/dispatch/route.ts`. Per quote,
   in this order: claim already held → skip (`already`); email unconfigured / no lead / no
   address / anonymised → skip (`skipped`, no claim, no rotation); mint token → `rotateQuoteLink`
   CAS against the digest read → `null` = skip; `sendLoggedEmail`. Reminder pass additionally
   requires the request's `sent` row to be ≥ 3 Lisbon days before today. One quote's failure
   never costs the others (try/catch per quote, as the reminder job does); log by ref, never an
   address or token. Summary line per pass — done when: tests cover reruns, the CAS loser, skip
   cases, and the late-deposit and 3-day-gap edges.
5. **The team flag** — `web/src/app/admin/sales/page.tsx`: a "Saldo por pagar" panel above the
   board from `listUnpaidBalancesDue`, rendered only when non-empty, each row linking to
   `/admin/sales/<lead id>` with request/reminder state from the log; `lead-quote-card.tsx`: the
   matching badge under the same rule (share one predicate, not two). Vocabulary from
   `.icm/docs/admin-pt-inventory.md` (orçamento, saldo) — done when: the page renders with and
   without due balances.

## Risks

- **Rotation without an email** — a rotate that lands and a send that never happens leaves the
  couple with dead links. Guarded by: config/address checks *before* rotation, the claim pre-check,
  and the CAS; a failed send releases its claim so tomorrow retries with a fresh link. Signal: a
  `failed` row for the quote on the Notifications page.
- **Double rotation on a rerun** — the pre-check must read the claim *before* minting; a test
  runs the job twice and asserts the stored digest is unchanged after the second run.
- **Lisbon vs UTC days** — use `todayKey` / `shiftDays` everywhere; a test at 23:30 UTC in
  summer.
- **The subject-shape move** — any existing caller or test using the catch-all shape for the
  balance kinds breaks `tsc` (there should be none — the kinds had no sender). The Notifications
  page must still label both kinds.
