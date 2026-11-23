# Handoff jam-506

## Next action

O Jamie lê `.icm/runs/jam-506/spec.md`, confirma as três respostas por omissão e marca **Spec
approved** em https://github.com/k0d0minio/agorasim/pull/277. Depois diz `build JAM-506`.

O Build lê primeiro `README.md`, `web/AGENTS.md` e `.icm/local/database.md`. A migração tem o
número `0042`. O pull request diz esse número, porque outros tickets com uma migração esperam.

## Decisões registadas

- Jamie, 2026-11-23, no chat: "implement".
- A pergunta do ticket ("Is this record compatible with the decision of 2026-09-18, no
  analytics and no cookie?") tem a resposta por omissão: sim. O Jamie confirma-a na aprovação
  da spec. Não é ainda uma resposta do Jamie.

## How to test

Ainda não há nada para testar: o Define não escreve código. Depois do Build: entre no preview
por `/pt?utm_source=chatgpt.com`, faça uma reserva, e veja "Origem: ChatGPT" no cartão do Sales
board.

## Blockers

- O Jamie marca **Spec approved** em https://github.com/k0d0minio/agorasim/pull/277.

## Do not touch

- `web/src/lib/fleet.ts`, `web/src/lib/availability.ts`, `web/src/components/booking-date-picker.tsx`
  e a lógica de ocupação de `web/src/lib/bookings.ts`: são da sessão de JAM-290.
- `workspaces/`: é da sessão de JAM-508.
- Em `web/src/lib/bookings.ts` e nas ações de `reservar`, mude só o que leva a origem.
- A produção e o cliente.
