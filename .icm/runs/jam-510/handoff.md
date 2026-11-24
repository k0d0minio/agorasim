# Handoff jam-510

## Next action

O operador responde a Q1, Q2 e Q3 no cartão do HUD (ou no pull request #285) e marca
**Spec approved**. Depois diz `build JAM-510`. O Build corre primeiro
`.icm/_system/scripts/questions.sh JAM-510` e põe as respostas em `spec.md`.

## How to test

Ainda não há alteração para testar. Esta etapa só escreve a spec.

## Blockers

- Q1, Q2 e Q3 esperam resposta.
- Spec approved não está marcado.
- A caixa "Research brief approved" de
  `workspaces/geo-content/stages/01_research/output/research.md` não está marcada em 2026-11-24.
  É do Jamie. O Build não corre a etapa 02 sem ela.
- O facto UNESCO da Ericeira tem de estar corrigido em `main` (lote de correções) antes do
  artigo 1.

## Do not touch

- A caixa da gate de `research.md`.
- O estado de publicação de qualquer artigo.
- A base de dados de produção.
