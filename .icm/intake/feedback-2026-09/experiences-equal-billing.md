# Stub: Both tours billed evenly on /experiencias, add-ons visible

- feature-slug: experiences-equal-billing
- epic: feedback-2026-09
- priority: P1
- size: M
- depends-on: none
- sequence: 3 of 3
- sources: Diogo's feedback relayed by Jamie, 2026-09-07 ("highlight both evenly,
  make the add-ons more visible"); `web/src/app/[locale]/experiencias/page.tsx`
  (hero vs "Outras experiências" vs the muted complements section);
  `web/src/lib/experience-catalogue.ts:183` (`signatureOf` returns the *first*
  signature)

## Problem

The experiences page promotes one tour and demotes the other, and the split is an
accident of ordering, not a decision in the data: both Rural Saloia and Óbidos &
Medieval Villages are `kind === "signature"` in the catalogue, and `signatureOf`
simply takes the first. That one gets a full-width hero ("Experiência principal",
highlights, price, booking CTA); Óbidos lands under "Outras experiências" as a small
card with no price line and no direct booking button. Diogo sells both and wants them
billed evenly. The add-ons (Tasco Galapito, Manzwine, Ramilo Wines) are the last
section on the page, in a muted band — the guest deciding between tours has usually
stopped scrolling by then.

## Proposed change

Restructure `/experiencias` so hierarchy follows the catalogue's `kind`, not its
order:

- Every `kind === "signature"` tour gets the same treatment — equal visual weight
  (two feature blocks, or alternating full-width bands), each with its summary,
  highlights, honest "from" price (`fromPriceLabel`) and its own `BookingButton`
  carrying its slug. Retire the "Experiência principal" / "Outras experiências"
  labels or make them apply to both.
- Add-ons move up and earn attention: a livelier section (imagery, price where the
  catalogue has one, "adicione ao seu passeio" copy), and/or a cross-link from each
  tour block so they read as part of composing a tour, not an appendix.
- `generateMetadata` stops describing the page by one tour's summary alone; keep
  canonical/hreflang and the per-tour JSON-LD (already emitted for all tours).
- PT and EN stay in sync (`Localized<T>`); answer-first copy per the GEO convention.

Scope is `/experiencias`. If the home page's tour presentation has the same
single-signature skew, note it in the PR rather than widening this one.

## Acceptance criteria (rough)

- [ ] Rural Saloia and Óbidos visually co-equal, each with price + booking CTA
- [ ] Add-ons prominent enough that a first scroll meets them
- [ ] PT/EN parity; metadata and JSON-LD still valid; CI green

## Prompt

In the agorasim repo (`web/`), rebalance the experiences page per
`.icm/intake/feedback-2026-09/experiences-equal-billing.md` — read that stub first.
Edit `web/src/app/[locale]/experiencias/page.tsx` so every `kind === "signature"`
tour from `listExperiences()` (`web/src/lib/experience-catalogue.ts`) gets equal
billing — summary, highlights, `fromPriceLabel` price, its own `BookingButton` with
its slug — and promote the add-ons (`complementsOf`) into a more visible section
and/or cross-links from each tour block. Update `generateMetadata` to describe both
tours; keep per-tour JSON-LD, canonical + hreflang, ISR (`revalidate = 3600`), and
PT/EN parity in every string. PR on a `claude/` branch; no local checks — CI is the
source of truth.
