# Handoff jam-318

## Next action

1. O operador responde à pergunta Q1 no cartão do HUD, ou no corpo do pull request #260.
2. O operador diz `new JAM-318`. A sessão corre `.icm/_system/scripts/questions.sh JAM-318`,
   põe a resposta em `spec.md`, faz commit e push, e corre
   `.icm/_system/scripts/new-run.sh JAM-318 --refresh-body`.
3. O operador marca **Spec approved** no pull request #260 e diz `build JAM-318`.

Define não escreveu código de produto. O ramo saiu de `main` (c0132ff). O ramo e o código do
pull request #249 não foram restaurados.

## How to test

Ainda não há nada para testar. Depois de Build: abrir `/admin/sales` na preview a 1024 px,
ver os cinco controlos de fase com as contagens no topo, tocar em "Reservado" e ver os seus
cartões logo por baixo.

## Blockers

- A pergunta Q1 espera a resposta do operador: uma fase de cada vez (por omissão), ou saltar
  para a fase numa página com todas as fases. Se a resposta for "saltar", os critérios 2 e 5
  e a secção Proposed change de `spec.md` mudam antes da aprovação.
- A caixa **Spec approved** do pull request #260 espera o operador.

## Do not touch

- Os ficheiros das sessões paralelas: JAM-317 (honeypot, os formulários e as suas ações),
  JAM-319 (as etiquetas de orçamento) e JAM-321 (a página Experiências).
- Build move o stub `.icm/intake/triage/sales-board-stage-shortcuts.md` para
  `.icm/intake/triage/_done/`. Define não o moveu.
