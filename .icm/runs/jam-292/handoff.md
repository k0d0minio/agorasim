# Handoff jam-292

## Next action

1. Esperar pelo merge do #277 (JAM-506, migração `0042_landing_source`). O Jamie marca Ready to merge no #277 e diz `release JAM-506`.
2. Depois desse merge, a sessão diz `build JAM-292` outra vez e faz, por esta ordem:
   - `git fetch origin && git merge origin/main` (merge, sem rebase). Conflitos esperados: `web/src/lib/sales.ts`, `web/src/components/admin/sales-board.tsx`, `web/src/app/admin/sales/`, `web/src/db/schema.ts`. Guardar as linhas da origem da reserva do #277 e as linhas do lembrete desta run.
   - Escrever `web/drizzle/0043_payment_reminder_kind.sql` com uma linha: `ALTER TYPE "public"."message_kind" ADD VALUE IF NOT EXISTS 'booking-payment-reminder';`
   - Acrescentar a entrada `idx: 43` em `web/drizzle/meta/_journal.json`, com `when` maior do que o da `0042` (`src/db/migrations-journal.test.ts` verifica isto).
   - Escrever `web/drizzle/meta/0043_snapshot.json`: cópia do `0042_snapshot.json` com `id` novo, `prevId` igual ao `id` da `0042`, e o valor novo no enum `message_kind`.
   - Push, `ci-status.sh 279 --watch`, pôr `status.md` em `phase: release` e `blocked: no`, mostrar o cartão do gate.
3. O operador testa no preview, marca **Ready to merge** no #279 e diz `release JAM-292`.

A palavra do Jamie, no chat, 2026-11-23: "Start the next set of parallel tickets please". Esta run é um desses tickets.
As perguntas 1 a 4 têm resposta do Jamie, no chat, 2026-11-23 (a resposta por omissão de cada uma). Estão no `spec.md` e no corpo do #279.
O Jamie disse `build`, no chat, 2026-11-23, com **Spec approved** marcado.

## Criteria

- Botão "Lembrar" no cartão de Vendas e na página do lead (verify: operator): escrito. Ver How to test. Só depois da migração `0043`.
- Uma reserva paga, cancelada, com retenção ativa, de partida passada ou de um lead sem email não mostra o botão, e a ação recusa-a (verify: CI): cumprido. `reminderVerdict` em `payment-reminder.test.ts`, `cardBooking` em `sales.test.ts`, `sendPaymentReminder` em `payment-link.test.ts`.
- Email na língua da reserva, com a partida, o grupo, o total e um link novo, em pt e en (verify: CI): cumprido. `payment-link.test.ts` e `payment-reminder.test.ts`.
- O link abre a página de pagamento, e uma partida sem lugar recusa o pagamento (verify: CI): cumprido. `payment-link.test.ts`, "leaves a link that refuses payment when the departure has no seat left".
- "Lembrete enviado 12/11 14:05" no cartão e na página do lead (verify: operator): escrito. `formatReminderTime` tem teste. Só depois da migração `0043`.
- Uma linha de auditoria por lembrete, e uma linha de mensagem do tipo novo (verify: CI): o código e os testes estão cumpridos. A base de dados ainda não aceita o tipo novo: falta a migração `0043`.
- O stub está em `.icm/intake/seats-and-holds/_done/` (verify: CI): cumprido.

O CI está GREEN no commit `8a49534` (93 ficheiros de teste). O preview deste commit não envia lembretes: sem a migração, a base de dados recusa a linha `booking-payment-reminder` e o botão responde "O email do lembrete não saiu".

## How to test

Só depois da migração `0043`. No preview, abra `/pt/reservar`, vá até ao formulário de pagamento e saia sem pagar. Espere 15 minutos. No admin, o cartão de Vendas desse pedido mostra "Não paga" e o botão "Lembrar". Toque no botão: o cartão passa a "Pagamento pendente" com "Lembrete enviado" e a hora, e o cliente recebe um email com um link de pagamento.

## Blockers

- O #277 não está em `main`. A migração `0043` não pode ser escrita antes: o journal do Drizzle pede índices seguidos, e a `0042` é do #277.
- Não marcar **Ready to merge** no #279 antes da migração `0043`.

## Do not touch

- `web/src/lib/fleet.ts`, `web/src/lib/availability.ts` e a ocupação em `web/src/lib/bookings.ts`. Esta run só os chama.
- As linhas da origem da reserva do #277.
- `web/drizzle/0042_*`: é do #277.

## Differences from the spec

- Um ficheiro novo que o `touches:` não nomeia: `web/src/lib/payment-reminder.ts` (a regra pura de quem pode ser lembrado) e o seu teste.
- O lembrete é recusado quando o envio de email não está configurado. Assim a reserva não muda sem um email.
- Numa reserva que voltou a `pending`, a retenção acaba no momento do lembrete. Um cliente que tocou em "voltar" deixa uma reserva `expired` cuja retenção ainda tinha minutos.
