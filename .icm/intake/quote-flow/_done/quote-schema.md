# Stub: Quotes and their payments — the schema

- feature-slug: quote-schema
- epic: quote-flow
- priority: P1
- size: M
- depends-on: none
- sequence: 1 of 5
- sources: 2026-08-29 data lens (`tour_requests.preferredDate` is free text — "'late August', 'flexible'"; `enquiry_kind` enum at `web/src/db/schema.ts:77` is the only event-shaped state); agreement §5 (two payments per event, each with its own fee)

## Problem

An event needs what no table holds: a quote (line items, total, terms version, a
**hard event date** a cron can compute T−14 against) and its payments — at least
deposit and balance, each with its own Stripe id, application fee, status and due
date. Payments are a child table, not columns: partial payments and re-issued links
must not overwrite each other.

## Proposed change

Migration: `quotes` (linked to the enquiry `tour_requests` row; event date as a real
date column; venue/location; line items or amount; deposit percent default 30; terms
window days default 30 + accepted-version field; status draft→sent→deposit-paid→
paid→cancelled) and `quote_payments` (kind deposit|balance|other, amount cents, due
date, Stripe session/PI id, fee cents, status). PII stays in `tour_requests` — the
quote holds money and dates only, mirroring the bookings/PII split, so retention and
erasure keep working.

## Acceptance criteria (rough)

- [ ] A quote with two payments, each independently trackable, is representable
- [ ] Event date is a date column; T−14 is computable in SQL
- [ ] Erasing the enquiry PII leaves the financial records intact (SET NULL pattern)
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add the quote schema per
`.icm/intake/quote-flow/quote-schema.md`: drizzle migration for `quotes` +
`quote_payments` following the repo's schema conventions (`web/src/db/schema.ts` —
notice the bookings/tour_requests PII split and its ON DELETE SET NULL pattern; copy
that discipline), plus the lib layer (`web/src/lib/quotes.ts`) with typed reads and
guarded writes. No UI yet. PR on a `claude/` branch; no local checks — CI is the
source of truth.
