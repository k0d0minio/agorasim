# Stub: The couple's quote page — the terms in front of them, the deposit paid on tap, the 6% on the instalment

- feature-slug: quote-page-and-deposit-link
- scope: quote-flow
- personas: guest, operator
- initiative: contracted feature ⑥ complete after launch / objective: the deposit holds the date and the fee lands
- priority: P1
- size: M
- depends-on: admin-quote-builder
- sequence: 3 of 6
- sources: D25 (quote page mints the Checkout session); product lens 2026-09-18 — no `[locale]/orcamento/[token]` route although `accessTokenHash` + `getQuoteByAccessTokenHash` and `reissuePayment` exist (`web/src/lib/quotes.ts:290-306,738-756`); `web/src/app/api/stripe/webhook/route.ts:156-193` hands every paid session to `confirmPaidBooking` (a deposit session would return `unknown-session` and fire the Sentry alert); `getPaymentBySessionId` / `markPaymentPaid` / `commissionOn("event")` have no callers; legal lens — DL 24/2014 art. 4(1) and 17(1)(l): price, payment schedule and the absence of a withdrawal right for a dated event must be stated before payment and confirmed on a durable medium; `terms.ts:151-156,233-238` defers the balance to "conditions in the quote"; ux lens — the sticky "Reservar" bar on `/casamentos` and `/eventos` points at the per-person tour checkout (`web/src/components/booking-bar.tsx:23-33`)

## Problem

A quote today has no page and no payment: an emailed raw Checkout session would expire
within 24 hours while couples open quotes days later, the webhook would treat a paid
deposit as an unknown booking, and the guest would pay without ever seeing the deposit,
balance and withdrawal terms the law says they must.

## Proposed change

A public, `noindex`, token-gated page `/[locale]/orcamento/[token]` showing the quote
(line items, total, the 30% deposit and the balance with its T−14 date), the event
terms (deposit non-refundable inside 30 days per D9, balance by link at T−14, no
withdrawal right for a dated event, seller identity) and one button that creates the
Checkout session for the instalment that is due — deposit first — on the connected
account with `commissionOn("event", instalment)` as the application fee, recording the
session on the `quote_payments` row (`markPaymentIssued`); the page after payment shows
the receipt state. The webhook branches on quote sessions before `confirmPaidBooking`:
`markPaymentPaid`, the `deposit-received` (or `balance-paid`) message through the log,
the lead-stage move from stub 1. The booking bar on the two quote pages either points at
`#orcamento` or is hidden.

## Acceptance criteria (rough)

- [ ] A couple opens their quote link days later, reads the terms, taps pay, completes Stripe Checkout on the connected account; the deposit row is `paid`, the 6% fee shows on both dashboards; the confirmation message is logged once
- [ ] The terms shown on the page match `terms.ts` and are reachable from the receipt email (durable medium); `acceptedTermsVersion` is stamped
- [ ] An expired session is re-minted on the next tap; the tour webhook path is unchanged; CI green

## Out of scope (this feature)

- Refunds (stub 4); capacity (stub 5); the T−14 issue job (stub 6 — this stub makes the balance payable from the page once its `due_date` has passed).
- Stored payment methods (breakdown).

## Notes for Define

- D25 fixes the mechanism; D9 the default window; the `[LAWYER]` question on "sinal" is
  open — use the terms' current wording and cite the question.
- Open for Define: whether the page also carries the "we cancel" rule for events —
  today the terms have it for tours only (legal lens finding 4); default: state what the
  terms state, no more.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/quote-flow/quote-page-and-deposit-link.md`
and the breakdown. Build `/[locale]/orcamento/[token]` (PT + EN) over `getQuoteByAccessTokenHash`,
the Checkout session for the due instalment on the connected account with the 6% fee via
`src/lib/commission.ts`, the quote branch in `src/app/api/stripe/webhook/route.ts` ahead of
`confirmPaidBooking`, the deposit-received/balance-paid messages through the log, and retarget
`src/components/booking-bar.tsx` on the two quote pages. Tests for the mint, the webhook
branch and the terms version stamp. PR on a `claude/` branch; no local checks — CI is the
source of truth.
