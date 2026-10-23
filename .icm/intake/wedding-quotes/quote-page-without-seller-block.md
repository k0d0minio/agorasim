# Stub: The quote page no longer shows the "Quem vende" block with Diogo's details

- feature-slug: quote-page-without-seller-block
- epic: wedding-quotes
- sequence: 5 of 6
- depends-on: deposit-button-first-on-quote-page
- complexity: low
- priority: P1

## Problem

The quote page shows "Quem vende": trading name, Diogo's legal name, tax number, address, email,
both phones, and the pending RNAAT line. Diogo: "it's not necessary to have a 'who sells' tab
with all my information." The same block is on `/termos`, which the quote page links to.

## Proposed change

The quote page shows one line with the trading name and a link to the terms page. The full
"Quem vende" block stays on `/termos`.

## Acceptance criteria

- [ ] The quote page shows no "Quem vende" block, no tax number, no address and no phone numbers.
- [ ] The quote page shows the trading name and a link "Condições e identificação do vendedor" to `/termos`, in PT and EN.
- [ ] `/termos` still shows the full block.

## Out of scope

- The content of the block itself.

## Notes

- Decision this stub leaves open. Jamie answers it in the pull request before the build:
  1. Distance-selling rules ask the seller to identify itself before the contract. Default: the trading name on the page and the full identification one tap away on `/termos` is enough. If Jamie wants counsel's word first, the stub waits.
- `SellerDetails` in `web/src/components/terms-of-sale.tsx` lines 66 to 108, rendered by `web/src/app/[locale]/orcamento/[token]/page.tsx` lines 263 to 266. Content in `web/src/content/terms.ts` lines 40 to 48 and 98 to 117.
