# Handoff jam-294

## Next action

1. O operador lê o `spec.md`, marca **Spec approved** no #282
   (https://github.com/k0d0minio/agorasim/pull/282) e diz `build JAM-294`.

O Jamie respondeu às perguntas no chat, em 2026-11-24. As respostas Q1 a Q5 estão no corpo do
#282. A Q6 nasceu da resposta à Q3, foi feita e respondida no chat, e está só no `spec.md`:

- Q1: a partida inteira, todos os motoristas e todas as viaturas (a resposta por omissão).
- Q2: sim, se sobrar um motorista e uma viatura (a resposta por omissão).
- Q3: sim, esta run constrói o botão. Não é a resposta por omissão.
- Q4: a coluna nova `quotes.kind`, com a migração `0044` (a resposta por omissão).
- Q5: um orçamento com carro retém um carro da sua classe (a resposta por omissão).
- Q6: num orçamento pago, a Rita escolhe o carro que o grupo usa. Um segundo botão retém a
  partida inteira outra vez. O botão escreve `hold_vehicle_class`.

A pergunta 6 do épico (`.icm/intake/seats-and-holds/breakdown.md`) não tem resposta do
cliente. A Q1 é a decisão do Jamie. Ninguém pergunta ao cliente nesta run.

Factos para o Build:

- O ramo é `claude/sleepy-ptolemy-9aee52`, cortado de `origin/main` em `83518a8`.
- A última migração em `main` é `0043_payment_reminder_kind`. O número livre é `0044`. Ler
  `web/drizzle/` em `origin/main` outra vez antes de escrever a migração.
- O mesmo formulário serve "Novo orçamento" e o rascunho da página do lead
  (`web/src/components/admin/lead-quote-card.tsx`).
- A página do cliente e os emails não mostram o carro. O carro aparece só no admin: na página
  do lead e em `web/src/app/admin/calendar/page.tsx`.
- `checkTourHold` está em `web/src/lib/tour-quote-hold.ts`, não em `quote-checkout.ts`.
  `quote-builder.ts` chama-o quando a equipa guarda o orçamento.
- O release tem uma migração: `migrate-production.yml` com a tag, antes de `promote`, à
  palavra do Jamie.

## How to test

Ainda não há nada para testar. O Build escreve este texto.

## Blockers

- O operador marca **Spec approved** no #282.

## Do not touch

- `web/src/lib/fleet.ts` (`assignVehicle`, `joinableCar`, JAM-290).
- As migrações `0042` e `0043`: estão em `main`.
- `.icm/intake/seats-and-holds/breakdown.md`: a pergunta 6 fica como está.
