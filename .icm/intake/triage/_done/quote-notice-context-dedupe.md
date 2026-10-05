# Stub: The two quote notices duplicate their lead lookup and email frame

- lane: chore
- found-by: quote-refund-echo-race (Release code review) · 2026-10-01
- complexity: low

## Problem

`sendEventCancelledNotice` copies `sendRefundNotice`'s lead lookup, locale, total-refunded sum
and result logging (`web/src/lib/quote-refund.ts`), and `guestQuoteEventCancelledEmail` copies
most of `guestQuoteRefundEmail`'s text and HTML frame (`web/src/lib/booking-emails.ts`). A fix
to one will drift from the other.

## Proposed change

Extract a `loadQuoteNoticeContext(quoteId)` and a shared quote-notice frame; no behaviour
change. Fits beside `quote-refund-hardening/refund-paths-dedupe`.

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-notice-context-dedupe.md`. Extract the
shared lead/locale/total lookup and the shared email frame without changing either email's
output (the existing `booking-emails.test.ts` and `quote-refund.test.ts` assertions stay green).
`git mv` this stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
