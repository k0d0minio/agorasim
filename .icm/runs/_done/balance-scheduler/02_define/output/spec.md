# Spec: The T−14 balance goes out by itself, is chased once at T−7, and the team sees an unpaid balance at T−3

- slug: balance-scheduler
- personas: guest, team
- touches: web/src/lib/cron/balance-scheduler.ts, web/src/lib/cron/jobs.ts, web/src/app/api/cron/dispatch/route.ts, web/src/lib/quotes.ts, web/src/lib/quote-token.ts, web/src/lib/message-log.ts, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/app/admin/sales/page.tsx, web/src/components/admin/lead-quote-card.tsx
- complexity: complex

## Problem

The accepted proposal (§5) and the live terms (`web/src/content/terms.ts`) promise that the
balance of a wedding or event is paid through a link sent 14 days before the event. That is
contracted feature ⑥, and the objective is "balance auto-collected 14 days before". The query
that finds those quotes (`listQuotesDueForBalance`) and the two message kinds
(`balance-request`, `balance-reminder`, migration `0021`) exist, but no job runs the query and
no email asks for the money. The quote page (#122) will take the balance from its due date, but
the couple only learns that if Rita writes to them by hand. If the money does not arrive, nothing
tells the team.

## Proposed change

A new job on the daily dispatcher (`lib/cron/jobs.ts`, 06:00 UTC, before either departure) runs
three passes over deposit-paid quotes. "Today" and "days before the event" are Lisbon calendar
days (`todayKey`), as in the day-before reminder.

**1. The balance request (T−14).** For every quote `listQuotesDueForBalance` returns (a
`deposit_paid` quote whose `balance` row is `pending`, with the event 14 days or fewer away), the
couple gets one `balance-request` email. The query uses `<=`, so a missed morning is caught the
next day, and a deposit paid inside T−14 is asked for the morning after. This includes deposits
paid by bank transfer and written off by the team, since `statusAfterPayment` already reads those
as `deposit_paid`. The email is in the quote's language (`quotes.locale`, PT/EN). It carries the
quote ref, the event date and venue, the balance amount and due date, a button to the quote page,
a line saying this link replaces any earlier one, and the team's contacts.

**2. The reminder (T−7), one send.** For every `deposit_paid` quote with the event 7 days or
fewer away and not yet past, a balance that is still unpaid (`pending` or `issued`), and a
`balance-request` logged as `sent` at least 3 days before today, the couple gets one
`balance-reminder` email. It has the same content and a chaser's wording. The 3-day gap stops
a late deposit from getting the request and the reminder a day apart. If the gap cannot be met
before the event, no reminder goes out and the team flag covers it.

**3. The team flag (T−3).** This is computed from the data, with no job, no column and no email.
A "Saldo por pagar" panel at the top of the Sales board lists every `deposit_paid` quote whose
event is 3 days or fewer away (or already past) and whose balance is neither paid nor written
off. Each row shows the ref, the couple's name, the event date and venue, the balance amount,
whether the request and the reminder went out, and a link to the lead. When the list is empty,
the panel is absent. The lead's quote card shows a matching "Saldo por pagar" badge under the
same rule.

**The link — rotated per email (decided in Define).** Only a digest of the quote token is stored
(`lib/quote-token.ts`), so the job cannot re-send a link that already went out. Each balance email
mints a fresh token, stores its digest on the quote and mails the plaintext. The newest email
always works. Links in older emails (quote-sent, deposit-received, the T−14 request once the
reminder has gone) then show the existing neutral "no longer valid" page with the contacts. The
rotation changes only `access_token_hash`. It never touches the quote's status, `sent_at`, terms
version or the lead's stage.

**Once only, and never a rotation without its email.** Both kinds are claimed in the message log
once per quote per recipient. They join the quote-keyed receipt shape in `lib/message-log.ts`, so
they fall under the existing `message_log_quote_receipt_key` index and no migration is needed.
For each quote the job:

1. Skips the quote if the kind is already claimed. A rerun rotates nothing.
2. Skips the quote, without claiming, if email is not configured, the quote has no lead or email
   address, or the lead is anonymised.
3. Rotates the link with a compare-and-swap on the digest it read. A concurrent run that loses
   the swap skips the quote.
4. Sends through `sendLoggedEmail`.

A failed send releases its claim as usual, so the next morning tries again with another fresh
link.

**`issued` stays the quote page's word.** Per D25, the page mints the Checkout session on tap and
`markPaymentIssued` stamps the row with that session. Checkout sessions last 60 minutes
(`QUOTE_SESSION_TTL_MINUTES`), so a session minted at 06:00 would be dead by the time the couple
reads the mail. The job therefore does not stamp `issued`. Its once-only guarantee is the log
claim. This departs from the stub's rough criterion ("the row is `issued`"), and the reason is
D25.

**Unpaid at T−0: nothing automatic.** Whether an unpaid balance releases the date and keeps the
deposit, or Rita chases by phone, is the client's decision and is still open (register → Open
questions). Until it is answered, the job flags and does nothing else. No date is released, no
quote is cancelled and no status like `overdue` is added.

The job reports one summary line to the dispatcher, for example `request: 2 sent, 0 already, 1
skipped, 0 failed · reminder: …`. It references quotes by ref and never logs an address or a
token.

## Acceptance criteria

- [ ] On the morning the event is 14 days away, a `deposit_paid` quote with an unpaid balance gets exactly one `balance-request` email in the quote's language. Its button opens the quote page, which offers "Pagar saldo". A second dispatcher run that morning, or on any later morning, sends nothing and does not change the quote's link
- [ ] A quote whose deposit is paid (by Stripe, or by transfer and written off) when the event is already fewer than 14 days away gets its request on the next morning's run. A quote 15 or more days out, a `sent` or `cancelled` quote, and a quote whose balance is paid or written off get nothing
- [ ] A quote whose balance is still unpaid when the event is 7 days or fewer away gets exactly one `balance-reminder` email, but only if its request was sent at least 3 days earlier. A balance paid before then gets no reminder, and a rerun sends none
- [ ] Each balance email's link works, and the links in that quote's earlier emails show the "no longer valid" page. Two runs racing on one quote send one email, and the link in that email is the one stored. A quote with no lead, no email address, an anonymised lead, or email unconfigured is skipped without a claim and without a link rotation
- [ ] From 3 days before the event, while the balance is unpaid and not written off, the Sales board shows the quote in a "Saldo por pagar" panel with its ref, couple, event date, venue, balance amount and request/reminder state, linking to the lead. The lead's quote card shows a matching badge. Paying the balance or writing it off removes both. The panel is absent when nothing is due
- [ ] Nothing is released, cancelled or re-stated automatically on or after the event date for an unpaid balance
- [ ] Unit tests cover the three windows and their edges (T−15, T−14, a late deposit, T−7 with and without the 3-day gap, T−3, a past event), the once-only rule across reruns, the compare-and-swap loser, the skip cases, and the email content in PT and EN. CI is green

## Out of scope

- Off-session charges or stored cards: each payment is a fresh Checkout session minted on the page (breakdown; D25).
- The unpaid-at-T−0 release rule and any "release the date" action. This is the client's open question. Once it is answered, it is its own stub (capacity release sits with `event-holds-capacity`).
- A team email or any other push notification for an overdue balance. The Sales board panel is the only signal (decided in Define).
- Keeping older links alive: storing the token recoverably (encrypted) was considered and rejected in Define.
- A deliberate "reenviar saldo" button for Rita. The admin's existing re-send and the page's re-mint cover a lost link for now.
- Wedding event-day reminders and post-event thank-yous (breakdown's out of scope).

## Open questions

- The T−7 chaser is in, with one send, on the stub's default. The register still lists it as a
  client question. If the client says no, it is a one-line removal of pass 2 via `revise`.
- Accepted edge: a couple with a Checkout session open at the moment a balance email rotates the
  link completes their payment normally (the webhook records it), but Stripe's return URL carries
  the old token and lands on the "no longer valid" page. The receipt email still arrives.
- Context budget: read `lib/quotes.ts`, `lib/message-log.ts`, `lib/quote-token.ts`,
  `lib/quote-checkout.ts` (mint path), `lib/cron/*` and the Sales page beyond the Inputs table
  to settle the link and idempotency design.
