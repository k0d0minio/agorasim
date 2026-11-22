# Handoff jam-293

## Cause

`/pt/reservar` and `/en/reservar` were cached for one hour (`revalidate = 3600`), and no
booking, payment or lapsed hold revalidates them. A hold lapses by the clock, so no event can
revalidate the page. The page now renders at each request (`dynamic = "force-dynamic"`).

## Next action

The operator tests the preview and ticks **Ready to merge**. Then `release JAM-293`.

## How to test

On the preview, open `/pt/reservar` and start a checkout for a departure until both cars of
that departure are held. Open `/en/reservar` in a new tab: that departure shows as unavailable
for a party that does not fit. After the holds lapse, a fresh load shows the seats again.

## Blockers

- none

## Do not touch

- The checkout re-check in `checkout-actions.ts`. It stays the last guard.
