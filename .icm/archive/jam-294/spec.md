# Spec: agorasim · A scratch tour quote has no car field and still holds its departure

- ticket: JAM-294
- touches: web/src/components/admin/lead-quote-card.tsx, web/src/lib/form-schemas.ts, web/src/lib/tour-quote.ts, web/src/lib/tour-quote-hold.ts, web/src/lib/event-holds.ts, web/src/lib/quote-checkout.ts, web/src/lib/quote-builder.ts, web/src/lib/quotes.ts, web/src/lib/bookings.ts, web/src/lib/availability.ts, web/src/db/schema.ts, web/drizzle/, web/src/app/admin/calendar/page.tsx, web/src/app/admin/sales/, web/src/lib/audit.ts, .icm/intake/seats-and-holds/
- complexity: standard

## Problem

"Novo orçamento" (`/admin/sales/new`) pede um carro ("Carro": clássico pequeno, VW T3 ou
viatura de turismo) num orçamento de passeio. Um orçamento de passeio pode usar vários carros.
O campo é também o que faz de um orçamento um orçamento de passeio
(`quotes.hold_vehicle_class`). Sem ele, o orçamento conta como evento: aplica-se a taxa de
evento, e um orçamento pago bloqueia o dia inteiro (`eventHoldKeysBetween` em
`web/src/lib/event-holds.ts`). O Diogo e a Rita pediram a alteração na ronda 2 de feedback
(2026-11-12).

Factos do código, lidos nesta fase:

- `isTourQuote` (`web/src/lib/tour-quote.ts`) lê só `hold_vehicle_class`. `tourHoldOf` pede as
  duas colunas (`hold_slot` e `hold_vehicle_class`), ou não devolve retenção.
- `parseTourHold` (`web/src/lib/form-schemas.ts`) recusa um passeio sem carro: "Escolha o carro
  do passeio."
- O mesmo formulário serve "Novo orçamento" e o rascunho na página do lead
  (`web/src/components/admin/lead-quote-card.tsx`). Os dois mostram "Carro".
- Um orçamento de passeio pago conta hoje como uma reserva privada: um motorista e um carro
  da sua classe (`tourHoldGroups`). Um orçamento enviado e não pago não retém nada.
- `checkTourHold` (`web/src/lib/tour-quote-hold.ts`) verifica o carro quando a equipa guarda
  o orçamento e antes de o Stripe abrir.
- A página do cliente e os emails não mostram o carro. Mostram "Passeio" e a partida. O carro
  aparece só no admin: na página do lead e no Calendário.
- A pergunta 6 do épico (`.icm/intake/seats-and-holds/breakdown.md`) não tem resposta do
  cliente. O Jamie decidiu no chat, em 2026-11-24: Q1.
- O admin não tem hoje uma forma de libertar um carro numa partida retida.

## Proposed change

- O formulário de um orçamento de passeio não tem o campo "Carro". Pede a data, a partida
  (manhã, tarde ou dia inteiro), o ponto de encontro e as linhas, como hoje.
- O orçamento gravado sem carro continua a ser um orçamento de passeio: um só pagamento
  (100%), a taxa de passeio, os textos de passeio e a linha da partida.
- Um orçamento de passeio pago retém a sua partida inteira. A partida deixa de estar à venda
  no site e no admin. A outra partida do mesmo dia fica à venda. "Dia inteiro" retém as duas.
- Um orçamento enviado e não pago não retém nada, como hoje.
- A equipa não consegue guardar o orçamento, e o cliente não consegue pagar, quando a partida
  já não tem motorista ou viatura, ou quando o dia tem um evento.
- No admin, a página do lead e o Calendário mostram "Partida inteira" no lugar do carro.
- Os orçamentos de passeio que já têm carro ficam como estão.
- Num orçamento de passeio pago, a Rita pode escolher o carro que o grupo usa. O orçamento
  passa a reter um motorista e esse carro, e o resto da partida volta a estar à venda. Um
  segundo botão retém a partida inteira outra vez.

Decisões do Jamie, no chat, em 2026-11-24. As respostas estão no corpo do #282:

1. **Q1, a retenção.** Um orçamento de passeio pago, sem carro, retém a partida inteira:
   todos os motoristas e todas as viaturas. É a resposta por omissão da pergunta 6 do épico.
   O cliente não respondeu. Custo: um passeio personalizado de 2 pessoas fecha a partida ao
   grupo aberto do VW T3, até a Rita escolher o carro (Q3 e Q6).
2. **Q2, a partida com reservas.** A equipa pode vender um orçamento numa partida que já tem
   reservas, se sobrar um motorista e uma viatura de qualquer classe. As reservas ficam com o
   seu carro. O orçamento fica com tudo o que sobra.
3. **Q3, libertar um carro.** Esta run constrói o botão. O Jamie não escolheu a resposta por
   omissão.
4. **Q4, o marcador.** Uma coluna nova `quotes.kind` (`tour` ou `event`) marca o orçamento.
   É a migração `0044`. A coluna tem o valor por omissão `event`, e a migração escreve `tour`
   em cada linha com `hold_vehicle_class`. A migração é compatível com o código que substitui:
   o código antigo não lê a coluna. Um orçamento com `hold_vehicle_class` conta sempre como
   passeio, para cobrir uma linha que o código antigo escreva durante o deploy.
5. **Q5, os orçamentos com carro.** Um orçamento de passeio com carro retém um carro da sua
   classe, como hoje. O admin mostra esse carro. Editar o rascunho, ou criar uma versão nova,
   mantém o carro. O formulário não o mostra.
6. **Q6, o botão.** Pergunta nova, nascida da resposta à Q3, feita e respondida no chat. Num
   orçamento de passeio pago, a Rita escolhe o carro que o grupo usa (clássico pequeno, VW T3
   ou viatura de turismo). O orçamento passa a reter um motorista e esse carro, e o resto da
   partida volta a estar à venda. Um segundo botão, "Reter a partida inteira", desfaz a
   escolha. O botão escreve `hold_vehicle_class`: não há dados novos, e não há uma lista de
   carros por orçamento.

Regras do botão, escolhidas nesta fase. O operador deve verificá-las antes da aprovação:

- Os botões estão na página do lead, no cartão do orçamento. Aparecem só num orçamento de
  passeio pago e não cancelado, com partida de hoje ou futura.
- A escolha recusa um carro que a partida já não tem livre, e diz isso.
- "Reter a partida inteira" segue a regra da Q2: as reservas que entraram entretanto ficam
  com o seu carro, e o orçamento fica com o que sobra.
- Um orçamento antigo com carro (Q5) é igual a um orçamento com carro escolhido. Mostra o
  botão "Reter a partida inteira".
- O registo de auditoria tem uma linha por alteração, com quem a fez.

Notas para o Build:

- Antes de escrever a migração, ler `web/drizzle/` em `origin/main` outra vez. O número é
  `0044` se nenhuma outra migração entrou.
- O release tem uma migração: `migrate-production.yml` com a tag, antes de `promote`, à
  palavra do Jamie (`.icm/local/ROUTES.md`).
- `assignVehicle` e `joinableCar` (`web/src/lib/fleet.ts`, JAM-290) não mudam.

## Acceptance criteria

- [ ] `/admin/sales/new` com "Tipo: Passeio" não mostra o campo "Carro", e o orçamento grava sem carro. (verify: operator)
- [ ] O formulário do rascunho de um lead de passeio, na página do lead, não mostra o campo "Carro". (verify: operator)
- [ ] Um orçamento gravado sem carro é um orçamento de passeio: um só pagamento de 100%, e a página do lead mostra a partida e "Partida inteira". (verify: CI)
- [ ] A taxa de passeio (4%, mínimo 10 €, máximo 50 €) aplica-se a um orçamento de passeio sem carro, e não a taxa de evento. (verify: CI)
- [ ] Um orçamento de passeio pago, sem carro, fecha a sua partida no site e no admin, e a outra partida do mesmo dia fica à venda. (verify: CI)
- [ ] Um orçamento de passeio enviado e não pago não retém nada. (verify: CI)
- [ ] Guardar o orçamento e abrir o pagamento recusam quando a partida não tem motorista ou viatura livre, ou quando o dia tem um evento. (verify: CI)
- [ ] A página do cliente e os emails mostram "Passeio" (pt) ou "Tour" (en) e a partida, como hoje, num orçamento sem carro. (verify: CI)
- [ ] O Calendário do admin mostra o orçamento de passeio pago na sua partida, com "Partida inteira". (verify: operator)
- [ ] Um orçamento de passeio que já tem carro continua a ser de passeio depois da migração, retém um carro da sua classe, e o admin mostra esse carro. (verify: CI)
- [ ] Num orçamento de passeio pago que retém a partida inteira, a página do lead tem um botão para escolher o carro do grupo. Depois da escolha, o orçamento retém um motorista e esse carro, e o resto da partida volta a estar à venda. (verify: operator)
- [ ] Num orçamento de passeio pago que retém um carro, o botão "Reter a partida inteira" fecha a partida outra vez. (verify: operator)
- [ ] A escolha recusa um carro que a partida não tem livre, um orçamento não pago ou cancelado recusa as duas ações, e o registo de auditoria tem uma linha por alteração. (verify: CI)
- [ ] A migração `0044` acrescenta o marcador e preenche-o nas linhas existentes, e o build do preview aplica-a e verifica-a (`db:migrate`, `db:verify`). (verify: CI)
- [ ] O stub `tour-quote-without-car.md` está em `.icm/intake/seats-and-holds/_done/`. (verify: CI)

## Out of scope

- Uma lista de carros por orçamento.
- Reter mais de um carro e menos do que a partida inteira.
- A regra do evento: um casamento ou evento com sinal pago continua a reter o dia inteiro.
- A atribuição de viaturas das reservas (`assignVehicle`, JAM-290).
- Perguntar ao cliente. A pergunta 6 do épico fica com o Jamie.
- A base de dados de produção. Migra no release, à palavra do Jamie.

## Open questions

- none
