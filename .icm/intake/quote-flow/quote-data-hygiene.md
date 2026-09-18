# Stub: The quote's data is complete before any money moves — kinds, erasure, stages, the transfer case

- feature-slug: quote-data-hygiene
- scope: quote-flow
- personas: team, guest
- initiative: contracted feature ⑥ complete after launch / objective: the quote data holds the business rules before the first real deposit
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 6
- sources: product lens 2026-09-18 — `web/src/db/schema.ts:224-233` (`message_kind` has only the two balance chasers; proposal §5 promises confirmations for car hire; `admin-preview.ts:50` already shows "Wedding deposit received"); `quotes.ts:666-685,786-845` write no `tour_requests.status` although `quoted`/`booked` exist (`schema.ts:75-81`); data + legal lenses — `web/src/lib/retention.ts:163-170` clears `tour_requests.venue` as personal but `quotes.venue` (`schema.ts:1252`) and `line_items` (`:1258`) survive `set null` erasure and are absent from the Art. 15 export (`subject-data.ts:55-85`); `retention.ts:231-237` exempts only `status = 'booked'` so a deposit-paid couple is anonymised after 730 days; `quotes.ts:170-173,231-234,376,889-906` — a bank-transfer deposit "written off" via `cancelPayment` leaves the quote `sent`, and `listQuotesDueForBalance` filters `deposit_paid`, so the T−14 job never fires for it

## Problem

Four small gaps in the shipped schema would each surface on the first real wedding: the
flow has no message kinds of its own (quote sent, deposit received, balance paid); a couple
who paid stays at "Contactado" on Rita's board and inside the retention sweep; the venue
and the line items Rita types are personal data the erasure and export do not reach; and
a deposit paid by bank transfer strands the balance scheduler.

## Proposed change

One migration and the library changes around it: add `quote-sent`, `deposit-received`,
`balance-paid` to `message_kind`; on deposit paid move the lead to `booked` (and on quote
sent to `quoted`) and record the source in the audit log; null `quotes.venue` and strip
`line_items` labels on erasure and anonymisation while keeping date and money; include
quotes reachable via `tour_request_id` in the subject export; make a transfer-paid deposit
put the quote in `deposit_paid` so `listQuotesDueForBalance` sees it. Update
`.icm/docs/data-protection.md`'s scope note in the same PR.

## Acceptance criteria (rough)

- [ ] Enum migration applied; the three kinds usable by later stubs
- [ ] Deposit paid → lead `booked`, quote sent → lead `quoted` (tests); a `booked` lead is exempt from anonymisation
- [ ] Erasure and anonymisation clear `quotes.venue` and line-item labels; the export includes the subject's quotes; transfer-paid deposits appear in `listQuotesDueForBalance`; CI green

## Out of scope (this feature)

- Any UI (stub 2); any Stripe call (stub 3); retention period for paid events (accountant question, register).

## Notes for Define

- D9, D20, D25 do not change this stub; it is bookkeeping every later stub reads.
- Open for Define: whether `line_items` should keep a non-personal shell (amount, count)
  after anonymisation for the statistics the retention job preserves elsewhere — default
  yes.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/quote-flow/quote-data-hygiene.md` and the
breakdown. Add the three message kinds, the lead-stage moves in `src/lib/quotes.ts`, the
erasure/anonymisation/export coverage of quotes in `src/lib/{retention,subject-data}.ts`
and the admin erasure action, and fix the transfer-paid deposit transition; one migration;
update `.icm/docs/data-protection.md`. Tests for each rule. PR on a `claude/` branch; no
local checks — CI is the source of truth.
