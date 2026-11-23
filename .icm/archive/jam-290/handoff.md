# Handoff jam-290

## Next action

O operador testa o preview e marca **Ready to merge** em https://github.com/k0d0minio/agorasim/pull/278. Depois diz `release JAM-290`.

A decisão do Jamie de 2026-11-23, no chat, palavra por palavra: "proceed". A run usa as respostas por omissão das perguntas 1 a 5 ao cliente (`.icm/intake/seats-and-holds/breakdown.md`). O Jamie marcou Spec approved e disse `build JAM-290` em 2026-11-23.

## Criteria

- Três casais de grupo aberto na mesma VW T3 com um condutor (verify: CI): cumprido. `the open group in the VW T3` em `availability.test.ts`, `carToOpen` em `fleet.test.ts`, `tallyOccupancy` em `bookings.test.ts`.
- Quarto casal na mesma carrinha, 8 de 8 lugares (verify: CI): cumprido. `availability.test.ts`.
- Quinto grupo de 1 a 3 pessoas abre um clássico pequeno com o segundo condutor, ou a partida fica indisponível (verify: CI): cumprido. `availability.test.ts`, `slotFitsParty, per person` em `fleet.test.ts`.
- Reserva privada de 2 adultos continua num clássico pequeno (verify: CI): cumprido. `availability.test.ts`, `fleet.test.ts`.
- Grupo privado com a VW T3: o grupo aberto de 1 a 3 usa um clássico pequeno, o de 4 a 8 vê indisponível (verify: CI): cumprido. `availability.test.ts`.
- O calendário do cliente oferece o que o checkout aceita (verify: CI): cumprido. O teste compara `slotFitsParty` com `fitsParty` em 8 partidas, nos dois modos, para grupos de 1 a 9.
- Testes em `fleet.test.ts` e `availability.test.ts` (verify: CI): cumprido. CI verde no commit `4eac5a3`: 92 ficheiros de teste passam.
- Três casais no preview e o título "Carro partilhado · VW T3 · 6 de 8 lugares" (verify: operator): por testar. Ver How to test.
  O agente `review-shots` não fez imagens: o preview pede o login da Vercel em todas as páginas, e o título só aparece com uma reserva paga de grupo aberto.
- Stub em `_done/` (verify: agent): cumprido. `.icm/intake/seats-and-holds/_done/open-group-rides-the-van.md` está no diff do pull request.

## What changed

- `carToOpen` em `web/src/lib/fleet.ts` é o único sítio da regra: um grupo aberto num tour de carros clássicos abre a VW T3 quando ela está livre. Senão, um grupo de 1 a 3 abre um clássico pequeno.
- `fitsParty` (`availability.ts`), `slotFitsParty` e `carChoices` (`fleet.ts`) e `moveBookingToCar` (`booking-move.ts`) usam essa regra. `tallyOccupancy` não mudou: já conta um carro aberto uma vez, seja qual for a classe.
- O título do carro aberto no calendário do admin diz "VW T3" para a carrinha.
- Sem migração. Sem texto novo para o cliente.

## How to test

No preview, abra `/pt/reservar`, escolha Rural Saloia em grupo aberto e reserve e pague três casais na mesma partida, com o cartão de teste do Stripe. O terceiro casal consegue reservar. No admin, o Calendário mostra nessa partida "Carro partilhado · VW T3 · 6 de 8 lugares" e um só condutor usado.

## Blockers

- none

## Do not touch

- Os ficheiros da JAM-506 (origem da reserva, com migração) e da JAM-508 (`workspaces/`). Correm noutras runs.
- A produção. O cliente: sem contacto.
