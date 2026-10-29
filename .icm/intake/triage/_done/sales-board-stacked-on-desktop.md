# Stub: On a laptop the Sales board stacks the stages downwards instead of scrolling sideways

- lane: tweak
- found-by: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`) · 2026-10-23
- complexity: low
- priority: P2

## Problem

From the `md` breakpoint up, the five stage columns are fixed at 304 px each in one horizontal
snap row, about 1568 px wide, so a laptop scrolls sideways (`web/src/components/admin/sales-stage-pager.tsx`
lines 31 to 131). Diogo: "on the sales section do you think is possible to open downwards all the
different types? Currently we need to slide left and right on laptop. On mobile phone is fine as
it is."

## Proposed change

From `md` up, the stages render one under the other, each as a full-width section with its
heading and its cards in a responsive grid. Below `md` nothing changes.

## Acceptance criteria

- [ ] At 1280 px width the Sales board has no horizontal scroll and shows the five stages one under the other.
- [ ] At 375 px width the board behaves as today.
- [ ] "Nada em {label} de momento." still shows for an empty stage.
