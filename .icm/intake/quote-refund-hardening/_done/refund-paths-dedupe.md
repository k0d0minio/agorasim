# Stub: The tour and quote refund paths copy each other's Stripe half

- feature-slug: refund-paths-dedupe
- scope: quote-refund-hardening
- personas: team
- initiative: contracted feature ⑥ hardening / objective: money already collected on a quote settles correctly under retries, races and stale reads
- complexity: low
- depends-on: none
- sequence: 5 of 5

## Problem

`issueInstalmentRefund` and `syncQuotePaymentRefundFromStripe` (`web/src/lib/quote-refund.ts`)
repeat `issueRefund` / `syncRefundFromStripe`'s skeleton from `web/src/lib/booking-refund.ts`;
`sendRefundNotice` re-reads the quote it already has via `getPayment` then `getQuote`; the
refund dialog (`web/src/components/admin/quote-refund-dialogs.tsx`) recomputes the ceiling
the page already computes with `instalmentRefundableCents`.

## Proposed change

Extract a shared `refundPaymentIntent({ paymentIntentId, amountCents, metadata, keyPrefix })`,
drop the extra read in the notice, and pass `refundableCents` to the dialog as a prop. No
behaviour change.

## Acceptance criteria (rough)

- [ ] One shared `refundPaymentIntent` helper backs both `issueRefund`/`syncRefundFromStripe`
      and `issueInstalmentRefund`/`syncQuotePaymentRefundFromStripe`
- [ ] `sendRefundNotice` no longer re-reads the quote it already has
- [ ] The refund dialog takes `refundableCents` as a prop instead of recomputing it
- [ ] No behaviour change — every existing test on both refund paths stays green unchanged

## Out of scope (this feature)

- None of the four correctness fixes ahead of it in this epic's build order — this stub
  extracts the shared shape those fixes leave behind; it changes no behaviour of its own.

## Notes for Define

- Sequenced last in this epic on purpose: extracting the shared helper before the four
  correctness fixes land would mean rebasing the dedupe over every one of them.
- `sources:` quote-refunds · Release code review · 2026-09-24 —
  `web/src/lib/quote-refund.ts`, `web/src/lib/booking-refund.ts`,
  `web/src/components/admin/quote-refund-dialogs.tsx`.
- `touches:` web/src/lib/quote-refund.ts, web/src/lib/booking-refund.ts,
  web/src/components/admin/quote-refund-dialogs.tsx

## Prompt

In the agorasim repo, read `.icm/intake/quote-refund-hardening/refund-paths-dedupe.md`. Do
the three de-duplications with no behaviour change; existing tests stay green. `git mv`
this stub to `_done/` in the PR, on a `claude/` branch.
