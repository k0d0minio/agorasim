# Handoff jam-294

## Next action

1. O operador testa no preview (How to test), marca **Ready to merge** no #282
   (https://github.com/k0d0minio/agorasim/pull/282) e diz `release JAM-294`.
2. Este release tem uma migração (`0044_quotes_kind`). Antes de `promote`, correr
   `migrate-production.yml` com a tag, à palavra do Jamie (`.icm/local/ROUTES.md`). As
   migrações `0042` e `0043` pedem o mesmo passo.
3. O operador diz ao Diogo e à Rita a decisão sobre a pergunta 6 do épico (`findings.md`, 2).

As palavras do Jamie, no chat, em 2026-11-24:

- Respondeu às perguntas Q1 a Q6. Q1, Q2, Q4 e Q5: a resposta por omissão. Q3: "Yes, a
  button". Q6: "Rita picks the one car". As respostas Q1 a Q5 estão no corpo do #282. A Q6
  está no `spec.md`.
- Disse "build 294", com **Spec approved** marcado.

## Criteria

O CI está GREEN no commit `5372404`: `code` (lint, typecheck e 95 ficheiros de teste), e o
build do preview na Vercel.

- `/admin/sales/new` com "Tipo: Passeio" sem o campo "Carro", e o orçamento grava sem carro
  (verify: operator): escrito, por testar. O esquema tem teste em `form-schemas.test.ts`.
- O rascunho de um lead de passeio sem o campo "Carro" (verify: operator): escrito, por
  testar. É o mesmo formulário.
- Um orçamento sem carro é de passeio, com um só pagamento de 100% e "Partida inteira"
  (verify: CI): cumprido. `quote-writes.test.ts` (`kind: "tour"`), `quote-builder.test.ts`,
  `tour-quote.test.ts`. O texto "Partida inteira" na página do lead não tem teste: ver How to
  test.
- A taxa de passeio aplica-se a um orçamento sem carro (verify: CI): cumprido.
  `tour-quote.test.ts` e `quote-checkout.test.ts`.
- Um orçamento pago, sem carro, fecha a sua partida, e a outra partida do dia fica à venda
  (verify: CI): cumprido. `event-holds.test.ts` (`applyDepartureHolds`) e
  `availability.test.ts` ("a departure held by a paid tour quote").
- Um orçamento enviado e não pago não retém nada (verify: CI): cumprido. A consulta
  `tourQuoteHoldsBetween` lê só os estados `deposit_paid` e `paid`, como antes. A consulta
  não tem teste: é a convenção do repo (`event-holds.test.ts`).
- Guardar e abrir o pagamento recusam uma partida sem motorista ou viatura, ou um dia com
  evento (verify: CI): cumprido. `tour-quote-hold.test.ts` (`checkTourHold`),
  `tour-quote.test.ts` (`tourHoldFits`), `quote-builder.test.ts`, `quote-checkout.test.ts`.
- A página do cliente e os emails mostram "Passeio" ou "Tour" e a partida (verify: CI):
  cumprido em parte. `quote-checkout.test.ts` prova o nome do pagamento e `tour: true` num
  orçamento sem carro. A página e os emails leem o mesmo `tourHoldOf`, que tem teste. Não há
  um teste novo que renderize a página ou o email de um orçamento sem carro.
- O Calendário mostra o orçamento pago na sua partida, com "Partida inteira" (verify:
  operator): escrito, por testar.
- Um orçamento com carro continua de passeio, retém um carro da sua classe, e o admin mostra
  o carro (verify: CI): cumprido. `tour-quote.test.ts`, `event-holds.test.ts`
  (`tourHoldGroups`), `quote-builder.test.ts` (guardar mantém o carro).
- O botão para escolher o carro do grupo (verify: operator): escrito, por testar.
- O botão "Reter a partida inteira" (verify: operator): escrito, por testar.
- A escolha recusa um carro que não está livre, um orçamento não pago ou cancelado recusa as
  duas ações, e uma linha de auditoria por alteração (verify: CI): cumprido.
  `tour-quote-hold.test.ts`.
- A migração `0044` acrescenta o marcador e preenche-o, e o build do preview aplica-a e
  verifica-a (verify: CI): cumprido. O deploy da Vercel completou, e
  `.icm/local/vercel-build.sh` corre `db:migrate` e `db:verify` antes do build. Não li o log
  do build.
- O stub está em `.icm/intake/seats-and-holds/_done/` (verify: CI): cumprido.

## How to test

No preview, abra `/admin/sales/new` com "Tipo: Passeio": não há campo "Carro". Crie o
orçamento, envie-o e pague-o com o cartão de teste. A página do lead mostra "Partida
inteira" e o botão "Escolher carro", e o Calendário mostra essa partida ocupada e a outra
partida do dia livre. Escolha um carro: a partida volta a ter lugares, e o botão passa a
"Reter a partida inteira".

## Blockers

- O operador marca **Ready to merge** no #282.

## Do not touch

- `web/src/lib/fleet.ts` (`assignVehicle`, `joinableCar`, JAM-290). Esta run só o chama.
- As migrações `0042` e `0043`: estão em `main`.
- `.icm/intake/seats-and-holds/breakdown.md`: a pergunta 6 fica como está.

## Differences from the spec

- Um ficheiro novo: `web/src/lib/tour-quote-hold.test.ts`.
- Ficheiros que o `touches:` não nomeia: `web/src/lib/admin-format.ts` (o texto da ação de
  auditoria nova) e `web/src/components/admin/availability-calendar.tsx` (a frase "ocupada
  por um passeio privado").
- O admin usa a palavra "condutor", como o resto do admin. O spec diz "motorista".
- Um orçamento com carro que é mudado para outro carro passa por "Reter a partida inteira" e
  depois "Escolher carro". Não há um botão direto.
- A ação de auditoria nova é `quote.hold_changed`. É texto, e não pede migração.
