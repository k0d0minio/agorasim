# Stub: The T−14 balance collection — automatic, per the proposal's promise

- feature-slug: balance-scheduler
- epic: quote-flow
- priority: P1
- size: M
- depends-on: payment-links
- sequence: 4 of 5
- sources: proposal §5 ("Balance due 14 days before the event, collected by a second automatic payment link"); 2026-08-29 data lens (one weekly cron cannot do this; daily dispatcher is lifecycle-messages/daily-dispatcher)

## Problem

The proposal promises the balance link is issued **automatically** 14 days before the
event. Nothing schedules anything: the only cron is weekly retention.

## Proposed change

A daily job (riding the lifecycle-messages dispatcher) that finds deposit-paid quotes
with event date exactly/at-most T−14 and an unissued balance payment, issues the
balance link, emails it (guest + team copy), marks issuance idempotently, and chases
once more at T−7 if unpaid. Overdue-unpaid at T−3 surfaces to the team, not the
guest — Rita decides.

## Acceptance criteria (rough)

- [ ] Deposit-paid quote crossing T−14 gets exactly one balance email, ever
- [ ] T−7 reminder if unpaid; T−3 flags the team
- [ ] Send recorded in the message log; CI green

## Prompt

In the agorasim repo (`web/`), implement the automatic balance collection per
`.icm/intake/quote-flow/balance-scheduler.md`. Depends on quote payment links (this
epic) and the daily dispatcher + message log
(`.icm/intake/lifecycle-messages/daily-dispatcher.md`,
`message-log-schema.md`) being merged — verify on main first. The job must be
idempotent across dispatcher runs (issuance recorded per payment row), timezone-safe
(Europe/Lisbon dates), and log every send in the message log. PR on a `claude/`
branch; no local checks — CI is the source of truth.
