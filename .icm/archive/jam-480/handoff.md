# Handoff jam-480

## Next action

O operador lê a página `.icm/docs/brand.md` no pull request #266. Pode mudar as respostas Q1 e
Q2 no corpo do pull request. Depois marca **Ready to merge** e diz `release JAM-480`.

## How to test

Abra `.icm/docs/brand.md` no separador "Files changed" do pull request #266. A página tem a
paleta, o mapa dos tokens, a tabela de contraste e as regras das ilustrações. O nível de
presença é B, framed.

## What changed

- Página nova: `.icm/docs/brand.md`. É a única casa das regras da marca. Os tickets JAM-481 a
  JAM-485 apontam para ela.
- A página tem: a paleta (seis cores do cartão e oito passos derivados, com hex e oklch), o mapa
  dos tokens de `web/src/app/globals.css`, a tabela de contraste, a tipografia, onde as
  ilustrações vão e onde nunca vão, e a lista de ficheiros a pedir ao designer.
- Q1 (presença B, framed) e Q2 (as três cores marcadas são as principais) usam o default. O
  briefing de 2026-11-23 pediu os defaults. O operador pode mudá-los no gate.
- Cada rácio de contraste e cada valor oklch foram calculados de novo a partir do hex. O
  "Orange tint" tem `oklch(0.852 0.063 70.8)`. O plano de 2026-11-22 dizia
  `oklch(0.853 0.066 70.5)`.

## Blockers

- none

## Do not touch

- Os ficheiros brutos das ilustrações em `web/public/images/` do checkout principal. Não entram
  no repositório (decisão D47).
- JAM-481 a JAM-485: esperam por este merge.
