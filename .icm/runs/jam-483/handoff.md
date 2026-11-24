# Handoff jam-483

## Next action

O operador responde a Q1, Q2 e Q3 no cartão do HUD (ou no pull request #284) e marca
**Spec approved**. Depois diz `build JAM-483`. O Build corre primeiro
`.icm/_system/scripts/questions.sh JAM-483` e põe as respostas em `spec.md`.

## How to test

Ainda não há alteração para testar. Esta etapa só escreve a spec.

## Blockers

- Q1, Q2 e Q3 esperam resposta.
- Spec approved não está marcado.
- O ticket diz "mover os ficheiros brutos antes do JAM-483". O run não os move (D47, ato do
  Jamie). O Build lê-os onde estão, no checkout principal
  (`web/public/images/wetransfer_ilustracao_sem_titulo-png_2026-11-18_1912/`), e não os adiciona
  ao git.

## Do not touch

- Os ficheiros brutos do designer.
- `.icm/docs/brand.md`.
