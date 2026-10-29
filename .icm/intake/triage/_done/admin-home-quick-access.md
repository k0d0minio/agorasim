# Stub: The admin home opens the new requests and the confirmed bookings in one tap

- lane: tweak
- found-by: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`) · 2026-10-23
- complexity: low
- priority: P1

## Problem

The admin home shows four stat cards that are not links: "Pedidos novos", "Rascunhos por rever",
"Publicados", "Sugestões em aberto". There is no count of confirmed bookings. Diogo: "we would
like to see ready to access the new requests and confirmed bookings." `/admin/sales` takes only
`?q=`, no stage filter (`web/src/app/admin/page.tsx` lines 72 to 145, `web/src/app/admin/sales/page.tsx`).

## Proposed change

Two cards at the top of the home, both links: "Pedidos novos" to the Sales board at the "Novo"
stage, and "Reservas confirmadas" to the Sales board at the "Reservado" stage. The board accepts
a stage in the URL and opens on it.

## Acceptance criteria

- [ ] The home shows "Pedidos novos" and "Reservas confirmadas" with counts, and each opens the Sales board on that stage.
- [ ] `/admin/sales?fase=novo` and `/admin/sales?fase=reservado` open on that stage on phone and desktop.
- [ ] The other stat cards are unchanged.
