# Handoff jam-318

## Next action

1. O operador marca **Spec approved** no pull request #260.
2. O operador diz `build JAM-318`.

Decisão do operador (Q1, 2026-11-19, no chat da sessão): de `md` para cima, o quadro mostra
uma fase de cada vez. `spec.md` e o corpo do pull request têm a resposta.

Define não escreveu código de produto. O ramo saiu de `main` (c0132ff). O ramo e o código do
pull request #249 não foram restaurados.

## How to test

Ainda não há nada para testar. Depois de Build: abrir `/admin/sales` na preview a 1024 px,
ver os cinco controlos de fase com as contagens no topo, tocar em "Reservado" e ver os seus
cartões logo por baixo.

## Blockers

- A caixa **Spec approved** do pull request #260 espera o operador.

## Do not touch

- Os ficheiros das sessões paralelas: JAM-317 (honeypot, os formulários e as suas ações),
  JAM-319 (as etiquetas de orçamento) e JAM-321 (a página Experiências).
- Build move o stub `.icm/intake/triage/sales-board-stage-shortcuts.md` para
  `.icm/intake/triage/_done/`. Define não o moveu.
