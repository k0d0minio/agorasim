# Spec: No balance email on the morning of the event itself

- slug: balance-request-not-on-event-day
- personas: team, guest
- touches: web/src/lib/balance-schedule.ts, web/src/lib/quotes.ts, web/src/lib/cron/balance-scheduler.ts, web/src/lib/balance-schedule.test.ts, web/src/lib/cron/balance-scheduler.test.ts
- complexity: trivial

## Problem

Contracted feature ⑥ (weddings & events) asks for the balance at T−14 and chases it once at
T−7; the objective of this hardening batch is that the scheduler and the Sales board agree on
what is still open and when. Today both guest emails can go out on the event's own day:
`isRequestInWindow` and `listQuotesDueForBalance`'s floor only say "not past", so a deposit paid
(or written off by transfer) the evening before puts the T−14 request in the 06:00 run on the
wedding morning; and `isReminderDue` with `listQuotesForBalanceReminder`'s floor let the T−7
reminder fire on the day when the request reached the couple at T−3. Each of those emails also
rotates the quote link, retiring every link the couple already had — on the day they least
need a surprise.

## Proposed change

Both guest-facing balance emails stop at **T−1**: the last day either can go out is the day
before the event.

- The request window becomes `daysBetween(today, eventDate) >= 1`, and the T−14 due query's
  lower bound on `event_date` moves from `today` to `today + 1`, so the query and the predicate
  state the same edge.
- The reminder window becomes `1 <= daysLeft <= 7`, and the T−7 reminder query's lower bound
  moves from `today` to `today + 1` likewise. The three-day gap after the request is unchanged.
- The doc comments that describe the window ("not past", "it stops at today", "between today
  and seven days out") are corrected to say the day before the event.

An event-day balance is then the team's alone, on the "Saldo por pagar" panel and the quote
card's badge, which already show it (T−3 flag, unchanged). No link is rotated on the event day.

## Acceptance criteria

- [ ] The T−14 balance request never goes out on the event's own day; it still goes out on the
      day before (T−1) when due
- [ ] The T−7 balance reminder never goes out on the event's own day; it still goes out on T−1
      when due
- [ ] `listQuotesDueForBalance` and `listQuotesForBalanceReminder` floor `event_date` at
      `today + 1`, agreeing with `isRequestInWindow` and `isReminderDue`
- [ ] `balance-schedule.test.ts` covers the edge for both predicates: event day → false, T−1 →
      true
- [ ] `cron/balance-scheduler.test.ts` covers a run on the event morning: no request and no
      reminder sent, and the quote's link digest is unchanged; a run at T−1 still sends
- [ ] The "Saldo por pagar" panel and the quote-card badge (`isBalanceFlagged`,
      `listUnpaidBalancesDue`) are unchanged — an event-day open balance still shows there
- [ ] CI green

## Out of scope

- Any automated event-day (T−0) rule — release the date, keep the deposit, cancel — stays the
  client's open question; the event-day balance stays the team's, worked from the panel.
- The panel's ordering when past events pile up (`unpaid-balances-panel-order`, stub 2 of this
  epic) and the shared "instalment still open" predicate (`one-open-instalment-rule`, stub 3).
- The quote page itself: a couple who opens a link they already hold can still pay on the day;
  only the scheduler's emails stop.

## Open questions

- none

D-1, taken at Define (operator, 2026-10-01): the T−7 reminder stops at T−1 too, not only the
T−14 request — the stub named only the request, but the reminder has the same event-morning
hole and also rotates the link.
