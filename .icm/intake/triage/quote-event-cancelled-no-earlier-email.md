# Stub: "Evento cancelado" points at an earlier refund email that may never have gone out

- lane: tweak
- found-by: quote-refund-echo-race (Release code review) · 2026-10-01
- complexity: low

## Problem

The `quoteEventCancelled` lead (`web/src/content/emails.ts`) always says the refund details were
sent in an earlier email. When that `quote-refunded` send failed or was skipped (email
unconfigured at the time), the couple are pointed at an email they never got — and the
cancellation notice is never retried either.

## Proposed change

When no sent `quote-refunded` row exists for the quote, use a variant lead that states the
refund total plainly without referring to an earlier email (PT + EN, Jamie to approve the copy).

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-event-cancelled-no-earlier-email.md`. Add
the variant lead (PT and EN in sync) and choose it from the message log in
`sendEventCancelledNotice` (`web/src/lib/quote-refund.ts`); test both. `git mv` this stub to
`_done/` in the PR, on a `claude/` branch; CI is the source of truth.
