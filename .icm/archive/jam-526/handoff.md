# Handoff jam-526

## Next action

O operador lê o diff de `workspaces/_config/business-facts.md` no pull request #283 e marca
**Ready to merge**. Depois diz `release JAM-526`.

## What changed

- O parágrafo do domínio em `workspaces/_config/business-facts.md` já não diz que o site fica
  online no dia da transferência do registo (2026-09-11).
- O parágrafo diz agora o estado verificado em 2026-11-24: `agorasim.pt` ainda serve o site
  WordPress antigo (resposta HTTP com `wp-json` e `wp-content`). O novo site fica online no
  go-live (JAM-471), numa data que ainda não está definida. O conteúdo não indica uma data de
  go-live.
- Nenhum outro ficheiro de `workspaces/` diz que o site está online numa data passada (procura
  feita por `go-live`, `goes live`, `is live`, `2026-09-11`, `transfer lands`).

## Why no user sees it

`business-facts.md` é uma entrada das pipelines de conteúdo. Nenhuma página do site o lê. O
site, os emails e a consola admin ficam iguais.

## How to test

Abra o diff do pull request #283. O parágrafo do domínio diz que agorasim.pt ainda serve o site
antigo e não dá nenhuma data de go-live.

## Blockers

- O operador marca Ready to merge.
- O ticket diz "não começar antes do go-live sem a palavra do Jamie". O run começou porque a fila
  de 2026-11-24 o pede. Quando o JAM-471 fixar a data, um novo ticket escreve essa data.

## Do not touch

- none
