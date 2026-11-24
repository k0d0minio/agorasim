# Handoff jam-294

## Next action

1. O operador responde às perguntas Q1 a Q5 no cartão do HUD, ou no corpo do #282
   (https://github.com/k0d0minio/agorasim/pull/282). Depois diz `new JAM-294`.
2. A sessão corre `.icm/_system/scripts/questions.sh JAM-294`, põe as respostas no `spec.md`,
   faz commit e push, e corre `new-run.sh JAM-294 --refresh-body`.
3. O operador marca **Spec approved** no #282 e diz `build JAM-294`.

A pergunta 6 do épico (`.icm/intake/seats-and-holds/breakdown.md`) não tem resposta do
cliente. A Q1 põe a mesma decisão ao Jamie, com a resposta por omissão do épico. Ninguém
pergunta ao cliente nesta run.

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

- O operador responde às perguntas Q1 a Q5 do #282.
- O operador marca **Spec approved** no #282.

## Do not touch

- `web/src/lib/fleet.ts` (`assignVehicle`, `joinableCar`, JAM-290).
- As migrações `0042` e `0043`: estão em `main`.
- `.icm/intake/seats-and-holds/breakdown.md`: a pergunta 6 fica como está.
