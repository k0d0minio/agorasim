# Spec: agorasim · Rita reminds a guest of an unpaid booking with one tap

- ticket: JAM-292
- touches: web/src/lib/payment-link.ts, web/src/lib/sales.ts, web/src/lib/message-log.ts, web/src/lib/admin-messages.ts, web/src/lib/admin-format.ts, web/src/lib/audit.ts, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/db/schema.ts, web/drizzle/, web/src/components/admin/payment-link-actions.tsx, web/src/components/admin/sales-board.tsx, web/src/app/admin/sales/, .icm/intake/seats-and-holds/
- complexity: standard

## Problem

Um cliente que sai do checkout antes de pagar deixa uma reserva não paga. A Rita não tem
forma de lembrar esse cliente. O admin tem "Reenviar link" só para as reservas por link de
pagamento (`web/src/components/admin/payment-link-actions.tsx`). O Diogo e a Rita pediram
este botão na ronda 2 de feedback (2026-11-12).

Factos do código, lidos nesta fase:

- `sendPaymentLink` (`web/src/lib/payment-link.ts`) recusa uma reserva de checkout. A sua
  condição pede `payment_link_token_hash` preenchido. A nota "not verified" do ticket fica
  assim fechada: não aceita.
- Uma reserva de checkout não paga fica `pending` pouco tempo. Quando a sessão Stripe acaba
  (30 minutos), ou o cliente toca em "voltar", `closeUnpaidBooking` escreve `expired`.
- Desde a JAM-291, o cartão de Vendas não mostra nada de um checkout cuja retenção caducou.
- `message_kind` é um enum do Postgres. Um tipo novo de mensagem precisa de uma migração.

## Proposed change

- Uma reserva de checkout não paga tem um botão "Lembrar" no cartão de Vendas e na página do
  lead.
- O botão envia ao cliente um email, na língua da reserva, com a partida, o grupo, o total e
  um link de pagamento novo. O preço é o da reserva, não o do catálogo de hoje.
- O link abre a página de pagamento que já existe (`/reservar/pagar/<token>`). Quando o
  cliente toca em "Pagar", a página verifica os lugares outra vez. Sem lugar, a página diz
  isso e não aceita pagamento.
- O cartão e a página do lead mostram quando foi o último lembrete.
- O registo de auditoria tem uma linha por lembrete.

Escolhas de implementação que o operador deve verificar antes da aprovação:

1. O lembrete transforma a reserva numa reserva por link de pagamento: recebe um
   `payment_link_token_hash`, volta a `pending` se estava `expired`, e não guarda lugar. A
   partir daí segue as regras que já existem: mostra "Pagamento pendente", confirma-se
   sozinha com o pagamento, e "Anular link" cancela-a. A lógica de lugares e de viaturas não
   muda: o lembrete só chama `startPaymentLinkCheckout`.
2. O botão aparece só na reserva mais recente do lead, e só quando: a reserva veio do
   checkout do site, não está paga, não foi cancelada, a retenção caducou, a partida é hoje
   ou futura, e o lead tem email e não foi anonimizado. Enquanto o cliente está no formulário
   de pagamento ("A aguardar pagamento", 15 minutos) não há botão.
3. O cartão de Vendas de um checkout não pago passa a mostrar a referência, o total e a
   etiqueta "Não paga", com o botão. A JAM-291 escondeu tudo neste caso. Depois de um
   lembrete o cartão mostra "Pagamento pendente" e "Lembrete enviado 12/11 14:05".
4. Cada toque é um email novo com um link novo. O link anterior deixa de funcionar. Numa
   reserva que já teve um lembrete, o botão continua a ser "Lembrar" (não "Reenviar link").
5. O email tem texto próprio, em pt e en. O texto do link de pagamento não serve: diz
   "Obrigado pelo contacto. Preparámos a sua reserva". Proposta:
   - Assunto: "A sua reserva ficou por pagar — {experience}, {date}" / "Your booking is not
     paid yet — {experience}, {date}".
   - Texto: "Começou uma reserva connosco e o pagamento não ficou concluído. Os detalhes
     estão abaixo. Se ainda quiser vir, basta pagar no link." / "You started a booking with
     us and the payment was not completed. The details are below. If you still want to come,
     pay through the link."
   - Rodapé: "Recebeu este email porque começou uma reserva em {site}." / "You are receiving
     this email because you started a booking at {site}."
   - O resto (os lugares não ficam guardados, o botão "Pagar a reserva", a nota de que o link
     substitui o anterior) é igual ao email do link de pagamento.
6. O lembrete é uma mensagem de serviço sobre uma reserva que o cliente começou, como o email
   do link de pagamento. Não passa pela lista de supressão de marketing.
7. A ação de auditoria nova é `booking.payment_reminder_sent`. O tipo novo de mensagem é
   `booking-payment-reminder` (pergunta 3). A hora do último lembrete vem dessas linhas.

## Acceptance criteria

- [ ] Uma reserva de checkout não paga, com partida de hoje ou futura, mostra o botão "Lembrar" no cartão de Vendas e na página do lead. (verify: operator)
- [ ] Uma reserva paga, cancelada, com retenção ativa, de partida passada ou de um lead sem email não mostra o botão, e a ação recusa-a. (verify: CI)
- [ ] O botão envia ao cliente um email na língua da reserva, com a partida, o grupo, o total e um link de pagamento novo, e o texto existe em pt e en. (verify: CI)
- [ ] O link abre a página de pagamento. Quando a partida já não tem lugar, a página diz isso e não aceita pagamento. (verify: CI)
- [ ] O cartão e a página do lead mostram quando foi o último lembrete, por exemplo "Lembrete enviado 12/11 14:05". (verify: operator)
- [ ] O registo de auditoria tem uma linha por lembrete, com quem o enviou, e o registo de mensagens tem uma linha do tipo novo. (verify: CI)
- [ ] O stub `remind-unpaid-booking.md` está em `.icm/intake/seats-and-holds/_done/`. (verify: CI)

## Out of scope

- Lembretes automáticos com horário.
- A lógica de lugares e de viaturas (`fleet.ts`, `availability.ts`, ocupação em `bookings.ts`). A JAM-290 muda-a no #278. Esta run só a chama.
- A origem da reserva (JAM-506, #277).
- Um lembrete por SMS ou WhatsApp.
- Um limite de lembretes por reserva.
- Produção. A mudança chega ao UAT com o merge.

## Open questions

- A palavra do Jamie, no chat, 2026-11-23: "Start the next set of parallel tickets please". Esta run é um desses tickets.
- As perguntas 1 a 4 estão no corpo do pull request. O spec tem a resposta por omissão de cada uma.
- A pergunta 3 pede uma migração. O #277 tem a `0042`. Esta run escreve a `0043` só depois de o #277 estar em `main`, e só depois da resposta do Jamie.
- O #277 muda `sales.ts`, `sales-board.tsx` e `web/src/app/admin/sales/`. O Build traz `main` para o ramo depois desse merge.
