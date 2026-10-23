# Stub: The Contacts page no longer shows the region card with the location icon

- lane: tweak
- found-by: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`) · 2026-10-23
- complexity: low
- priority: P2

## Problem

`/contactos` shows a full-width card with a MapPin icon, the heading "Entre em contacto" and the
text "Saloia (Sintra · Mafra · Ericeira), Portugal" (`web/src/app/[locale]/contactos/page.tsx`
lines 79 to 87). It links nowhere. Diogo calls it "the Contact Saloia button with the location
icon" and wants it removed.

## Proposed change

Remove the card. The email, phone and booking button stay.

## Acceptance criteria

- [ ] `/contactos` shows no MapPin card and no "Saloia (Sintra · Mafra · Ericeira), Portugal" line.
- [ ] The other contact routes on the page are unchanged.
