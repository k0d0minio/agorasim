# Stub: The deposit button sits under the quote, before the terms

- feature-slug: deposit-button-first-on-quote-page
- epic: wedding-quotes
- sequence: 4 of 6
- depends-on: balance-payable-from-deposit
- complexity: low
- priority: P1

## Problem

On the quote page the pay button comes after the quote card, the payments card and every term.
Diogo: "Paying a first deposit should be right after the quote and not in the end of everything."
The deposit is payable as soon as the quote is sent, but the page makes it look like the last
step.

## Proposed change

The pay button and its one-line consent sentence move to the top of the page, under the quote
card. The terms stay below, and the consent sentence links to them.

## Acceptance criteria

- [ ] On a sent quote, "Pagar sinal de {amount}" is visible without scrolling past the terms, at 375 px and 1280 px width, in PT and EN.
- [ ] On a deposit-paid quote, "Pagar restante de {amount}" sits in the same place.
- [ ] The consent sentence under the button still links to the terms on the page.
- [ ] The embedded payment form opens in place as today.

## Out of scope

- The order of the terms themselves.

## Notes

- `web/src/app/[locale]/orcamento/[token]/page.tsx` lines 277 to 306 hold the button. The page order is header, quote, payments, terms, button, questions.
