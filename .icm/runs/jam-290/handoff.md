# Handoff jam-290

## Next action

O operador lê `spec.md` e marca **Spec approved** em https://github.com/k0d0minio/agorasim/pull/278. Depois diz `build JAM-290`.

A decisão do Jamie de 2026-11-23, no chat, palavra por palavra: "proceed". A run usa as respostas por omissão das perguntas 1 a 5 ao cliente (`.icm/intake/seats-and-holds/breakdown.md`) e não espera pelo cliente. As respostas estão no corpo do pull request e em `spec.md`.

A Build lê primeiro o código que a JAM-291 e a JAM-293 fundiram em 2026-11-23: `fitsParty` e `checkSlotAvailable` (`web/src/lib/availability.ts`), `tallyOccupancy` e `BOOKING_HOLD_MINUTES` (`web/src/lib/bookings.ts`), `withDepartureLock` (`web/src/lib/departure-lock.ts`). A regra do carro novo de um grupo aberto fica num só sítio de `web/src/lib/fleet.ts`, para o servidor, o browser (`slotFitsParty`) e "Mudar de carro" (`carChoices`) darem a mesma resposta. A Build move o stub `open-group-rides-the-van.md` para `.icm/intake/seats-and-holds/_done/` neste pull request.

## How to test

No preview, abra `/pt/reservar`, escolha Rural Saloia em grupo aberto e reserve e pague três casais na mesma partida. O terceiro casal consegue reservar. No admin, o Calendário mostra "Carro partilhado · VW T3 · 6 de 8 lugares" e um só condutor usado.

## Blockers

- O operador marca **Spec approved** em https://github.com/k0d0minio/agorasim/pull/278.

## Do not touch

- Os ficheiros da JAM-506 (origem da reserva, com migração) e da JAM-508 (`workspaces/`). Correm noutras runs.
- A produção. O cliente: sem contacto.
