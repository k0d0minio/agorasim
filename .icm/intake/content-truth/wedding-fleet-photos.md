# Stub: The missing wedding-fleet photos — chase, then wire

- feature-slug: wedding-fleet-photos
- epic: content-truth
- priority: P2
- size: S
- depends-on: none
- sequence: 6 of 7
- blocked: client — photos must be re-sent (the info PDF's WeTransfer links expire; T3 and 4L wedding shots specifically)
- sources: copy lens: PR #30 keeps `image: null` for Renault 4L and VW T3 → "Fotografias a caminho" tiles; info PDF §2.1 (client already sent WeTransfer links — likely expired: they last days, sent 2026-08-18)

## Problem

The weddings page (landing via booking-live) will still show "photographs on their
way" for half the fleet. The client's WeTransfer links from August have almost
certainly expired; the assets may exist on Jamie's disk from the original download —
check before asking.

## Proposed change

First look in `web/public/images/{weddings,fleet}/` and Jamie's local downloads for
usable T3/4L wedding shots (17 + 12 files exist — some may fit). If genuinely
missing, the re-request rides the open-questions pack (already added). When photos
land: optimise, place, alt-text, remove the `photosSoon` tiles.

## Acceptance criteria (rough)

- [ ] All four fleet cars photographed on /casamentos; no "photographs on their way"
- [ ] Images optimised (<500KB source), real alt text
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), complete the wedding fleet imagery per
`.icm/intake/content-truth/wedding-fleet-photos.md`: first audit
`web/public/images/weddings/` and `web/public/images/fleet/` for usable Renault 4L
and VW T3 wedding-context shots before declaring them missing (the README in
`web/public/images/` documents the set); if present, wire them into
`web/src/content/weddings.ts` fleet entries and drop the `photosSoon` tiles. If
absent, confirm the ask is in the icm-board deal-folder question pack and leave this
stub blocked. PR on a `claude/` branch; no local checks — CI is the source of truth.
