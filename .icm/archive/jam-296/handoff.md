# Handoff jam-296

## Next action

O operador lê `.icm/project-rules.md` no pull request #256, marca **Ready to merge** e diz
`release JAM-296` ou carrega em "Merge now".

## O que mudou

`.icm/project-rules.md` era o modelo vazio do blueprint. Agora tem as regras deste repositório:
a pasta de docs da lane `knowledge` (`.icm/docs/`), a app em `web/`, pnpm com `--filter web`,
o texto bilingue, o driver Neon e as migrações. Nenhum ficheiro do produto mudou, por isso
nenhum utilizador vê diferença.

## How to test

Abra o pull request 256 e leia o ficheiro project-rules. Confirme que cada regra é verdadeira
para o agorasim.

## Blockers

- none

## Do not touch

- none
