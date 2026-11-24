# Handoff jam-292

## Next action

1. O operador testa no preview (How to test), marca **Ready to merge** no #279 e diz `release JAM-292`.
2. Este release tem uma migração (`0043_payment_reminder_kind`). Antes de `promote`, correr `migrate-production.yml` com a tag, à palavra do Jamie (`.icm/local/ROUTES.md`). O #277 (`0042`) pede o mesmo passo.

A palavra do Jamie, no chat, 2026-11-23: "Start the next set of parallel tickets please". Esta run é um desses tickets.
As perguntas 1 a 4 têm resposta do Jamie, no chat, 2026-11-23 (a resposta por omissão de cada uma). Estão no `spec.md` e no corpo do #279.
O Jamie disse `build`, no chat, 2026-11-23, com **Spec approved** marcado. Depois do merge do #277 disse "#277 merged, build", no chat, 2026-11-23.

## Criteria

- Botão "Lembrar" no cartão de Vendas e na página do lead (verify: operator): escrito, por testar. Ver How to test.
- Uma reserva paga, cancelada, com retenção ativa, de partida passada ou de um lead sem email não mostra o botão, e a ação recusa-a (verify: CI): cumprido. `reminderVerdict` em `payment-reminder.test.ts`, `cardBooking` em `sales.test.ts`, `sendPaymentReminder` em `payment-link.test.ts`.
- Email na língua da reserva, com a partida, o grupo, o total e um link novo, em pt e en (verify: CI): cumprido. `payment-link.test.ts` e `payment-reminder.test.ts`.
- O link abre a página de pagamento, e uma partida sem lugar recusa o pagamento (verify: CI): cumprido. `payment-link.test.ts`, "leaves a link that refuses payment when the departure has no seat left".
- "Lembrete enviado 12/11 14:05" no cartão e na página do lead (verify: operator): escrito, por testar. `formatReminderTime` tem teste.
- Uma linha de auditoria por lembrete, e uma linha de mensagem do tipo novo (verify: CI): cumprido. `payment-link.test.ts`. A migração `0043` acrescenta o valor `booking-payment-reminder` ao enum `message_kind`, e o build do preview aplicou-a e verificou-a (`db:migrate`, `db:verify`).
- O stub está em `.icm/intake/seats-and-holds/_done/` (verify: CI): cumprido.

O CI está GREEN no commit `415b82c`, com `main` (o #277 incluído) no ramo. O merge de `main` não teve conflitos.

## How to test

No preview, abra `/pt/reservar`, vá até ao formulário de pagamento e saia sem pagar. Espere 15 minutos. No admin, o cartão de Vendas desse pedido mostra "Não paga" e o botão "Lembrar". Toque no botão: o cartão passa a "Pagamento pendente" com "Lembrete enviado" e a hora, e o cliente recebe um email com um link de pagamento.

## Blockers

- none

## Do not touch

- `web/src/lib/fleet.ts`, `web/src/lib/availability.ts` e a ocupação em `web/src/lib/bookings.ts`. Esta run só os chama.
- As linhas da origem da reserva do #277.
- `web/drizzle/0042_*`: é do #277.

## Differences from the spec

- Um ficheiro novo que o `touches:` não nomeia: `web/src/lib/payment-reminder.ts` (a regra pura de quem pode ser lembrado) e o seu teste.
- O lembrete é recusado quando o envio de email não está configurado. Assim a reserva não muda sem um email.
- Numa reserva que voltou a `pending`, a retenção acaba no momento do lembrete. Um cliente que tocou em "voltar" deixa uma reserva `expired` cuja retenção ainda tinha minutos.
