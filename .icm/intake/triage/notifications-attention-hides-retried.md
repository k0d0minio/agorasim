# Stub: "Precisa de atenção" keeps a failed send after its retry went out

- lane: tweak
- found-by: notifications-page-real / Release code review · 2026-09-25
- complexity: low

## Problem

`needsAttention` (`web/src/lib/admin-messages.ts`) lists every `failed` row in the window as «Falhou — a mensagem não saiu». A failed row releases its claim, and the thank-you cron, a re-delivered Stripe webhook (booking confirmation) or a later send of the same kind can then succeed under a new row — the old failed row keeps warning Rita for 30 days and may prompt her to contact a guest who already got the mail. The approved spec (D-4) lists all failed sends, so this is a behaviour change, not a Release fix.

## Proposed change

Leave a `failed` row out of "Precisa de atenção" when a later `sent` (or `sending`) row exists for the same kind, recipient and subject (booking + subject date + move-seq, enquiry, or quote key) — select those subject columns in `recentMessages`; keep the row in the day list.
