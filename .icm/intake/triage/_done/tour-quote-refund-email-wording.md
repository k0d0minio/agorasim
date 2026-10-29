# Stub: A refund or cancel email for a tour quote says "passeio", not "evento" or "sinal"

- lane: tweak
- found-by: PR payment-link-from-scratch, build · 2026-10-28
- complexity: low
- priority: P2

## Problem

A tour quote from "Novo orçamento" is one payment for a tour. The quote-sent email, the receipts
and the quote page use tour words. The refund email (`guestQuoteRefundEmail`) and the
event-cancelled email (`guestQuoteEventCancelledEmail`) in `web/src/lib/booking-emails.ts` still
say "evento" and "sinal" for a tour quote. Their copy is `quoteRefund` and `quoteEventCancelled`
in `web/src/content/emails.ts`.

## Proposed change

Give both emails a tour variant, as `quoteReceipt.tour` does. Read the kind with `isTourQuote`
from `web/src/lib/tour-quote.ts`.

## Acceptance criteria

- [ ] A refund on a tour quote sends an email that says "passeio" and "pagamento", in PT and EN.
- [ ] A cancelled tour quote sends an email that says "passeio", in PT and EN.
- [ ] The refund and cancel emails for a wedding or event do not change.
