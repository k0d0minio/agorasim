# Spec: "Saldo por pagar" — the nearest events first, whatever piles up in the past

- slug: unpaid-balances-panel-order
- personas: team, operator
- touches: web/src/lib/quotes.ts, web/src/lib/quotes.test.ts, web/src/components/admin/unpaid-balances-panel.tsx, web/src/app/admin/sales/page.tsx
- complexity: standard

## Problem

`listUnpaidBalancesDue` (`web/src/lib/quotes.ts`) reads every deposit-paid quote whose event
is three days away or fewer, or already past, with the balance still open. It has no lower
date bound, sorts by event date ascending and stops at 50 rows. Past events whose balance
nobody recorded or wrote off stay on the list for good, by design: nothing auto-releases
until the client decides the T−0 rule. Once 50 of them pile up, the upcoming events inside
T−3 — the ones the panel exists for — fall off the end, and nothing on the board says so.
Unlikely at today's volume, invisible when it happens. This advances contracted feature ⑥
hardening: the T−14 balance scheduler and the Sales board's unpaid-balances read agree on
what is still open and when.

## Proposed change

- **Two reads, each with its own cap.** `listUnpaidBalancesDue` keeps its eligibility rule
  unchanged — `quotes.status = 'deposit_paid'`, a `balance` instalment `pending` or `issued`
  with `amount_cents > 0`, event on or before today + `BALANCE_FLAG_DAYS_BEFORE` (the rule
  `isBalanceFlagged` states) — and splits it at today (`todayKey(now)`, the same day key the
  function already uses):
  - **upcoming** — `event_date >= today` and `<= today + 3`, ordered by event date ascending
    (soonest first), capped at 50;
  - **past** — `event_date < today`, ordered by event date descending (most recent first),
    capped at 50;
  - **pastTotal** — a count of every past row matching the rule, so the panel can say how
    many it did not show.

  The two reads and the count never share a limit, so no number of past rows can push an
  upcoming one off. The return value becomes `{ upcoming, past, pastTotal }` (each list of
  the existing `UnpaidBalance` row shape); the one caller (`app/admin/sales/page.tsx`) is
  updated, including its `.catch` fallback and the search branch (both empty).
- **The panel.** `UnpaidBalancesPanel` takes the two lists and the hidden-past count:
  - the upcoming rows render first, exactly as today;
  - the past rows render under a subheading **"Eventos passados"** (vocabulary:
    `admin-pt-inventory.md` → Event = Evento), same row layout and badge ("Há 2 dias");
  - when `pastTotal` exceeds the past rows shown, one muted line under the past list:
    **"+ N eventos passados não mostrados"** (singular "+ 1 evento passado não mostrado");
  - a section with no rows renders no heading; the whole panel still renders nothing when
    both lists are empty. When only past rows exist, they still sit under "Eventos passados".
  - The card's title and description are unchanged.
- **Balance messages.** The "what has gone to the couple" line is read for the quotes the
  panel shows — upcoming and past together — as today.

## Acceptance criteria

- [ ] With more than 50 unresolved past balances and at least one balance due inside T−3, every upcoming (T−3 to today) balance appears on the panel, listed first, soonest first
- [ ] Past unresolved balances remain visible under an "Eventos passados" subheading, most recent first; nothing that `isBalanceFlagged` flags is filtered out, only separated and capped
- [ ] When more past balances exist than the panel shows, a line states how many are not shown ("+ N eventos passados não mostrados", singular form for 1); with none hidden, no such line
- [ ] With no past rows the panel looks as it does today (no subheading); with no rows at all the panel is not rendered; a search still hides it; a read failure still leaves the board up without the panel
- [ ] A test at the `@/db` boundary (the repo's convention — e.g. `message-log.test.ts`) seeds more than 50 past rows plus upcoming rows inside T−3 and asserts the upcoming ones all come back, ordered soonest first, alongside the capped past list (most recent first) and the true past total; CI green

## Out of scope

- Any T−0 auto-release rule for event-day balances — still the team's decision, unchanged.
- Changing which balances are flagged (the T−3 rule, the statuses, the zero-amount
  exclusion) — `isBalanceFlagged` and the query's predicate stay as they are; unifying the
  "instalment still open" predicate is `balance-scheduler-hardening/one-open-instalment-rule`.
- Paging or a separate page for the full past list; a link to see the hidden past rows.
- The lead's quote-card badge ("Saldo por pagar" on `lead-quote-card.tsx`).

## Open questions

- none. Decided with the operator in Define on 2026-10-01: split into two reads with an
  "Eventos passados" subheading (not a single reordered list), and show a count line for
  past rows beyond the cap.
