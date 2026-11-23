# Spec: agorasim · Open-group bookings on one departure share the VW T3, up to 8 guests

- ticket: JAM-290
- touches: web/src/lib/fleet.ts, web/src/lib/fleet.test.ts, web/src/lib/availability.ts, web/src/lib/availability.test.ts, web/src/lib/bookings.ts, web/src/lib/booking-move.ts, web/src/components/booking-date-picker.tsx, web/src/components/admin/availability-calendar.tsx, .icm/intake/seats-and-holds/
- complexity: complex

## Problem

Um grupo aberto de 1 a 3 pessoas recebe um clássico pequeno de 3 lugares (`assignVehicle`,
`web/src/lib/fleet.ts`). Dois casais na mesma partida ocupam dois carros e os dois condutores,
e o site recusa um terceiro casal. O Diogo e a Rita fazem o grupo aberto na VW T3: 8 pessoas
e um condutor (ronda de feedback 2, 2026-11-12). O defeito foi reproduzido no UAT, na partida
de 28 de novembro às 14h00.

## Proposed change

- Uma reserva de grupo aberto de Rural Saloia fica na VW T3 da sua partida. As reservas
  seguintes entram na mesma carrinha até aos 8 lugares. A carrinha usa um condutor.
- Com a carrinha cheia, um segundo carro aberto pode sair com o segundo condutor: um clássico
  pequeno, até 3 pessoas.
- Quando um grupo privado tem a VW T3 nessa partida, o grupo aberto usa os clássicos pequenos,
  como hoje.
- Um grupo privado fica com o carro que o seu tamanho dá hoje.
- O calendário do cliente e o checkout usam a mesma regra. O calendário oferece só o que o
  checkout aceita.
- O calendário do admin mostra a carrinha aberta com os lugares pagos.

### Decisão do operador

O Jamie decidiu no chat em 2026-11-23, palavra por palavra: "proceed". A JAM-290 começa com as
respostas por omissão das perguntas ao cliente (`.icm/intake/seats-and-holds/breakdown.md`) e
não espera pelo cliente.

| Pergunta | Resposta usada |
|---|---|
| 1. Todas as partidas de grupo aberto de Rural Saloia vão na VW T3? | Sim: 8 pessoas, 1 condutor. As respostas do cliente de 2026-08-18 (pedido de informação, §1.5) dizem o mesmo: a T3 leva grupos até 8. |
| 2. A frase do cliente pára em "and we also have a …". Qual é o resto? | Sem resposta. O resto provável: grupos maiores usam os dois veículos, 14 pessoas no máximo (respostas de 2026-08-18). Isto é uma leitura, não é um facto. A build não depende dela. |
| 3. Com a carrinha aberta cheia, pode sair um segundo carro aberto? | Sim: um clássico pequeno com o segundo condutor, até 3 pessoas. |
| 4. Um grupo privado tem a VW T3 nessa partida. O grupo aberto usa os clássicos pequenos? | Sim, como hoje. |
| 5. O grupo aberto precisa de um mínimo de pessoas para sair? | Não. |

### Escolhas que o operador deve verificar antes da aprovação

1. A primeira reserva de grupo aberto de uma partida fica com a VW T3. Um grupo privado de 4 a
   8 pessoas já não consegue reservar essa partida online, porque só há uma carrinha. Isto
   vem da resposta 1.
2. Um grupo nunca é dividido por dois carros. Um grupo de 1 a 3 pessoas que não cabe nos
   lugares livres da carrinha abre o segundo carro (resposta 3), se há um condutor e um
   clássico pequeno livres. Um grupo de 4 a 8 pessoas que não cabe vê a partida como
   indisponível. Uma partida leva no máximo 11 pessoas de grupo aberto: 8 mais 3.
3. Um grupo entra primeiro num carro aberto do seu tour com lugares, como hoje. Só abre um
   carro novo quando nenhum tem lugar. O carro novo é a VW T3 quando ela está livre. Senão é
   um clássico pequeno, para 1 a 3 pessoas.
4. A regra é para os tours em carros clássicos com preço por pessoa. Hoje é Rural Saloia.
   Óbidos não muda.
5. "Mudar de carro" com "Um carro novo" segue a mesma regra do ponto 3.
6. O título da carrinha aberta no calendário do admin é "Carro partilhado · VW T3 · 6 de 8
   lugares". Conta só reservas pagas, como a JAM-291 definiu. Um checkout aberto aparece à
   parte.
7. Não há migração. As reservas abertas que existem ficam no seu carro. A Rita muda-as com
   "Mudar de carro".
8. A retenção de 15 minutos da JAM-291 não muda. Um checkout aberto guarda os seus lugares na
   carrinha durante a retenção.

## Acceptance criteria

- [ ] Três reservas de grupo aberto de 2 adultos cada, na mesma partida de Rural Saloia, ficam na mesma VW T3 e usam um condutor. (verify: CI)
- [ ] Uma quarta reserva de grupo aberto de 2 adultos nessa partida entra na mesma carrinha: 8 de 8 lugares. (verify: CI)
- [ ] Uma quinta reserva de grupo aberto de 1 a 3 pessoas nessa partida abre um clássico pequeno com o segundo condutor. Sem condutor ou sem clássico pequeno livre, a partida fica indisponível para esse grupo. (verify: CI)
- [ ] Uma reserva privada de 2 adultos noutra partida continua a ocupar um clássico pequeno. (verify: CI)
- [ ] Quando um grupo privado tem a VW T3 numa partida, uma reserva de grupo aberto de 1 a 3 pessoas usa um clássico pequeno, e uma de 4 a 8 pessoas vê a partida como indisponível. (verify: CI)
- [ ] O calendário do cliente oferece a um grupo aberto as mesmas partidas que o checkout aceita, com a carrinha aberta e os seus lugares livres. (verify: CI)
- [ ] Os testes em `web/src/lib/fleet.test.ts` e `web/src/lib/availability.test.ts` cobrem cada linha acima. (verify: CI)
- [ ] No preview, três casais de grupo aberto reservam e pagam a mesma partida de Rural Saloia, e o calendário do admin mostra "Carro partilhado · VW T3 · 6 de 8 lugares". (verify: operator)
- [ ] O stub `open-group-rides-the-van.md` está em `.icm/intake/seats-and-holds/_done/` neste pull request. (verify: agent)

## Out of scope

- Grupos acima de 8 pessoas online e um terceiro condutor. O pedido de contacto continua.
- Óbidos. Já partilha a viatura de turismo.
- Preços e escalões.
- Um mínimo de pessoas para o grupo aberto sair (resposta 5).
- Quantos carros um orçamento de tour ocupa (pergunta 6 do `breakdown.md`, stub `tour-quote-without-car`).
- O botão "Lembrar" (stub `remind-unpaid-booking`).
- O texto das perguntas frequentes do site sobre os carros.
- Mover as reservas abertas que já existem para a carrinha.
- Contacto com o cliente. A produção.

## Open questions

- Esta mudança inverte a pergunta 1 de `open-and-private-tours/shared-seats-on-open-departures`
  (2026-10), que deixava desconhecidos partilhar um clássico pequeno.
- Se o cliente responder às perguntas 1 a 5 de outra forma, a mudança precisa de um novo ticket.
