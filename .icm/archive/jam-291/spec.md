# Spec: agorasim · Only a paid booking takes a seat on a departure

- ticket: JAM-291
- touches: web/src/lib/bookings.ts, web/src/lib/booking-checkout.ts, web/src/lib/sales.ts, web/src/lib/admin-format.ts, web/src/components/admin/sales-board.tsx, web/src/components/admin/availability-calendar.tsx, web/src/app/admin/calendar/page.tsx, web/src/content/booking.ts, web/src/content/terms.ts, .icm/intake/seats-and-holds/
- complexity: standard

## Problem

Um checkout guarda o carro durante 30 minutos antes do pagamento (`BOOKING_HOLD_MINUTES`,
`web/src/lib/bookings.ts`). O admin mostra esses lugares como ocupados. Uma reserva cuja
retenção caducou deixa de contar, mas fica `pending` com "Pagamento pendente" até ao job
semanal `expireLapsedHolds`. O Diogo e a Rita dizem que uma reserva não paga não ocupa lugar.

## Proposed change

- No admin, só uma reserva paga conta como lugar reservado. Um checkout aberto aparece à
  parte, como "A aguardar pagamento".
- O checkout guarda os lugares durante 15 minutos (pergunta 1 do Jamie no `breakdown.md`,
  resposta por omissão). A página do cliente diz "15 minutos".
- Uma retenção que caducou sai logo do estado "Pagamento pendente" e os seus lugares ficam
  livres no calendário do cliente.
- Dois clientes não pagam os mesmos últimos lugares.

Escolhas de implementação que o operador deve verificar antes da aprovação:

1. O Stripe não aceita uma sessão de Checkout que expira antes de 30 minutos. A sessão fica
   com 30 minutos, a retenção com 15. Quando um novo checkout precisa dos lugares de uma
   retenção caducada, a app expira primeiro essa sessão no Stripe (sob o bloqueio da partida).
   Assim o primeiro cliente já não consegue pagar.
2. Se um pagamento chega depois de a retenção caducar: a reserva é confirmada se os lugares
   ainda estão livres. Se não estão, a reserva não é confirmada e o pagamento fica para a
   equipa (o caminho "needs a human" que já existe para um pagamento tardio).
3. O estado mostrado vem do relógio, como a regra de capacidade: uma reserva `pending` com a
   retenção caducada e sem link de pagamento mostra "Expirada" logo. O job semanal fica para
   a coluna da base de dados. Não há migração.

## Acceptance criteria

- [ ] O calendário do admin e o quadro de Vendas contam só reservas pagas como lugares reservados. (verify: CI)
- [ ] Uma reserva em checkout aparece como "A aguardar pagamento", à parte dos lugares reservados. (verify: operator)
- [ ] A retenção do checkout dura 15 minutos, e a página de reserva e os termos dizem "15 minutos" em pt e en. (verify: CI)
- [ ] Uma retenção caducada não aparece como "Pagamento pendente" no quadro de Vendas nem na página do lead, e os seus lugares estão livres no calendário do cliente. (verify: CI)
- [ ] Um novo checkout que toma os lugares de uma retenção caducada expira primeiro a sessão Stripe dessa retenção. (verify: CI)
- [ ] Um pagamento que chega depois da retenção caducar não confirma uma reserva cujos lugares já foram tomados. (verify: CI)

## Out of scope

- O botão "Lembrar" (JAM-292, `remind-unpaid-booking`).
- As reservas por link de pagamento. Não guardam carro até o cliente tocar em "Pagar".
- O reembolso automático de um pagamento tardio. A equipa trata dele, como hoje.
- Um cron por minuto para expirar retenções.
- A carrinha do grupo aberto (JAM-290).

## Open questions

- Pergunta 1 do Jamie (tempo de retenção): resposta por omissão do `breakdown.md`, 15 minutos,
  não mostrado como lugar reservado no admin. O Jamie pode mudar isto no gate Spec approved.
