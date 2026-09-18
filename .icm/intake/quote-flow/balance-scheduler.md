# Stub: The T−14 balance — issued by itself, chased once, and the unpaid rule written down

- feature-slug: balance-scheduler
- scope: quote-flow
- personas: guest, team
- initiative: contracted feature ⑥ complete after launch / objective: "balance auto-collected 14 days before" is true
- priority: P1
- size: M
- depends-on: quote-page-and-deposit-link
- sequence: 6 of 6
- sources: proposal §5 ("the balance request goes out automatically"); `web/src/lib/quotes.ts:362` (`listQuotesDueForBalance`, `balanceDueDate` with `BALANCE_DUE_DAYS_BEFORE=14`), `message_kind` `balance-request` and `balance-reminder` (`0021`), the dispatcher (`web/src/lib/cron/jobs.ts`); product lens 2026-09-18 — no `overdue` state in `quotePaymentStatusEnum` (`schema.ts:311`), nothing tells the team, and nobody has decided whether an unpaid balance releases the date; the purged `balance-scheduler` stub sketched T−7/T−3; register open question (client): unpaid at T−0

## Problem

The proposal promises the balance is collected automatically 14 days before the event. The
query that finds those quotes exists; no job runs it, no message asks for the money, and
the team has no signal when it does not arrive.

## Proposed change

A dispatcher job that, each morning, issues the balance for every quote whose balance is
due (stub 3's page makes it payable; this job sends the `balance-request` message with the
quote link and stamps `markPaymentIssued`), sends one `balance-reminder` at T−7 if still
unpaid, and at T−3 flags the quote for the team (a row on the Sales board's attention
list, or the day sheet — Define picks) — every send claimed in the log. The unpaid-at-T−0
rule (release the date and keep the deposit, or Rita chases by phone) is the client's;
until answered the job flags and does nothing else, and the spec says so.

## Acceptance criteria (rough)

- [ ] On the T−14 morning the balance request goes out once, with the link; the row is `issued`; a rerun sends nothing
- [ ] T−7 reminder once if unpaid; T−3 team flag visible in the admin; nothing auto-releases without the client's rule
- [ ] Transfer-paid deposits are included (stub 1); CI green

## Out of scope (this feature)

- Off-session charges or stored cards — a fresh session each time (breakdown).
- The release-the-date action — stub 5's territory once the client answers.

## Notes for Define

- D25: the request links to the quote page; the page mints the session.
- Open for Define: whether the T−7 chaser is wanted at all (register question, client);
  default yes, one send.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/quote-flow/balance-scheduler.md` and the
breakdown. Register a dispatcher job in `src/lib/cron/` over `listQuotesDueForBalance`
that issues the balance request, the T−7 reminder and the T−3 team flag, each claimed in
`src/lib/message-log.ts`; templates in `src/lib/booking-emails.ts`; the flag surfaced in
the admin. Tests for the three windows and the once-only rule. PR on a `claude/` branch;
no local checks — CI is the source of truth.
