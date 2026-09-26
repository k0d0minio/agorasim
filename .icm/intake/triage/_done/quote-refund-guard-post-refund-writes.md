# Stub: A database error after a quote refund surfaces as an error page

- lane: bug
- found-by: quote-refunds · Release code review · 2026-09-24
- complexity: low
- superseded-by: quote-refund-hardening/quote-refund-guard-post-refund-writes.md — batched with the other quote-refunds findings, same file surface

## Problem

`refundQuotePayment` (`web/src/lib/quote-refund.ts`) promises never to throw, but the writes in
`settleInstalmentRefund` after Stripe has refunded are unguarded: a Neon error throws through the
server action, the requested cancellation and the notice are skipped, and the operator sees an
error page for money that did move.

## Proposed change

Catch after the refund, log loudly, and return a distinct outcome ("refunded, books not updated —
the webhook will reconcile") so the action tells the operator the truth.

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-refund-guard-post-refund-writes.md`. Guard
the post-refund writes in `refundQuotePayment` with an outcome the admin action words plainly, and
test it; PR on a `claude/` branch; CI is the source of truth.
