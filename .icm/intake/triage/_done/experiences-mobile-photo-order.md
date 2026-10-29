# Stub: On a phone, two tour photos stack with no text between them on /experiencias

- lane: bug
- found-by: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`) · 2026-10-23
- complexity: low
- priority: P1

## Problem

`web/src/app/[locale]/experiencias/page.tsx` lines 67 to 118 alternate the image side per tour
block with `imageOnRight = i % 2 === 0`. Below 1024 px the grid is one column, so the Rural
Saloia block ends with its photo and the Óbidos block starts with its photo. Two photos appear
one after the other.

## Proposed change

Below `lg`, every tour block renders text first, then the photo. The alternation applies at
`lg` and above only.

## Acceptance criteria

- [ ] At 375 px width, no two tour photos on `/experiencias` are adjacent.
- [ ] At 1280 px width, the image side still alternates per block.
