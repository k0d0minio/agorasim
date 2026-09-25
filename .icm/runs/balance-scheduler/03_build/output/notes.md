# Build notes: balance-scheduler

- commits: feat: balance-scheduler — the T−14 request, the T−7 reminder, the T−3 flag
- ci: GREEN on c4df0bd (full gate: Vercel preview pass, Quality (advisory) pass)

## What changed

- `web/src/lib/message-log.ts`: `balance-request` / `balance-reminder` moved into the quote-keyed receipt shape (`QUOTE_BALANCE_KINDS`) — claimed under `message_log_quote_receipt_key`, no migration; `listQuoteBalanceMessages` reads them back; `sendLoggedEmail` also takes a `ClaimedMessage` — a builder run only after the claim is won, whose `null` or throw gives the claim back (deleted, not marked failed).
- `web/src/lib/balance-schedule.ts` (new): the calendar rules in Lisbon days — `isRequestInWindow`, `isReminderDue` (T−7, ≥ 3 days after the request), `isBalanceFlagged` (T−3, the one predicate the panel and the badge share), the log read-back helpers and the panel's labels. Its three numbers live in `web/src/lib/quote-math.ts` so `quotes.ts` can query with them without a cycle.
- `web/src/lib/quotes.ts`: `listQuotesForBalanceReminder`, `listUnpaidBalancesDue`, `listBalanceRecipients`, and `rotateQuoteLink` — a compare-and-swap of `access_token_hash` on a `deposit_paid` quote, nothing else touched.
- `web/src/content/emails.ts` + `web/src/lib/booking-emails.ts`: `guestBalanceEmail` (request / reminder, PT/EN) with the "this link replaces the earlier ones" note; the deposit receipt's next-steps line now says the quote link holds "until then" (D-6).
- `web/src/lib/cron/balance-scheduler.ts` (new), imported by `web/src/app/api/cron/dispatch/route.ts`: two passes — request, then reminder — per quote: claim held → `already`; no lead / no address / anonymised → `skipped` (no claim, no rotation); otherwise `sendLoggedEmail` with a builder that mints the token, swaps the digest, and writes the mail. A deployment without mail or a token secret runs nothing.
- `web/src/components/admin/unpaid-balances-panel.tsx` (new) on `web/src/app/admin/sales/page.tsx` (hidden during a search); the "Saldo por pagar" badge on `lead-quote-card.tsx`, computed in `web/src/app/admin/sales/[id]/page.tsx`.
- Tests: `balance-schedule.test.ts`, `cron/balance-scheduler.test.ts` (new); `message-log.test.ts` and `booking-emails.test.ts` extended.

## Acceptance criteria status

- [x] T−14 request once, in the quote's language, link to the quote page; reruns and later mornings send nothing and keep the link — `balance-scheduler.test.ts` "the T−14 request"; "Pagar saldo" is the page's existing `dueInstalment` from the due date.
- [x] Late deposit asked next morning; T−15, sent/cancelled quotes, paid/written-off balances get nothing — same file.
- [x] One reminder at T−7, only ≥ 3 days after the request; none if paid; none on rerun — "the T−7 reminder".
- [x] Each email's link is the stored one; a racing run stands down; skip cases claim and rotate nothing — "the link and the claim"; `message-log.test.ts` "the balance kinds".
- [x] "Saldo por pagar" panel and badge from T−3 while open; cleared by paid / written off; absent when empty — `isBalanceFlagged` tests; the panel renders nothing for an empty list. Verified by reading, not in a browser — the preview smoke is the check.
- [x] Nothing released or cancelled after the event — "releases, cancels and re-states nothing…".
- [x] CI green — full gate on c4df0bd.

## Notes for Release

- **Spec gap D-4:** the spec's order was "pre-check → rotate (CAS) → send". Build found that a run reading the quote *after* another run's swap but *before* its claim could rotate again and kill the winner's link, so the rotation now happens inside the claim (`ClaimedMessage`). The pre-check stays (it saves a mint); the claim decides.
- **Spec gap D-5:** the request pass skips an event already past, since the due query has no floor.
- `sendLoggedEmail` can now throw — only when a `ClaimedMessage` builder throws, after giving its claim back. Every existing caller passes a plain message and is unaffected.
- The base's migration-order failure (`0031_add_booking_move_seq` after 0032 on `uat-agorasim`) was fixed on `main` by #154 and merged into this branch before the flip; the preview migrated and built green.
- `web/.env.example`: `CRON_SECRET` now declares `# [production,preview]` (decisions D-7) — `env.sh audit --changed` flagged it because the dispatcher route changed.
