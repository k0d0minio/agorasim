# Breakdown: Guest self-serve cancellation — the 48h promise gets a mechanism

- epic-slug: cancellation-selfserve
- sources: client confirmation "free cancellation up to 48h — correct" (info PDF §1.4); D7 (2026-08-29: self-serve links, Jamie's explicit choice over admin-driven); 2026-08-29 data + product lenses (promise exists in three copy locations, no flow anywhere)

## What I understood

"Free cancellation up to 48 hours before" is promised on the checkout, both tours'
FAQs and every confirmation email — and no cancellation path exists in any form.
Jamie chose guest self-serve: the confirmation email carries a signed cancel link;
outside 48h it cancels and refunds (default: automatically — client asked to confirm);
inside 48h it blocks with a contact prompt. Bookings hold no guest identity by design,
so the signed token *is* the authentication. The refund substrate (webhook handling,
proportional fee return, seat release) is `commission-engine/refund-machinery` —
sequence this epic after it. Bad weather ("reschedule via email, refund on extreme
conditions") needs an admin move-booking action, defaulted to an audited in-place edit.

## Build order

1. cancellation-token-schema — token + cancellation columns — depends-on: none
2. cancel-route-flow — public signed route, 48h gate, refund, emails — depends-on: cancellation-token-schema
3. admin-cancel-refund — the same action from the Sales board for phone/WhatsApp cancellations — depends-on: cancellation-token-schema
4. admin-move-booking — weather reschedule as an audited date/slot edit — depends-on: admin-cancel-refund

## Out of scope (whole epic)

- Wedding/event quote cancellation — that flow's deposits have their own terms
  (quote-flow/).
- Any change to the 48h window itself — client-confirmed as correct.
