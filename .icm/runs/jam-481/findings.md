# Findings jam-481

The operator files these later. One entry for each finding.

## brand.md diz "no change" para --destructive, mas a condição falha

- where: `.icm/docs/brand.md`, mapa de tokens, linha `--destructive`
- what: A página diz "no change" e pede 4.5:1 em `bg-destructive/10` sobre o fundo novo. Com o
  valor de hoje o texto mede 4.16:1 sobre Off-white. Este run escurece o vermelho para
  `oklch(0.49 0.19 27)` (Q4). A página precisa do valor novo e de uma linha na tabela de contraste.
- proposed: knowledge

## brand.md não tem os dois passos de teal dos emails

- where: `.icm/docs/brand.md`, "Derived steps", e `emailPalette` em `web/src/lib/email-layout.ts`
- what: Os emails usam um passo mais escuro da cor principal (`primaryDark`) e um fundo claro da
  cor principal (`primaryTint`). A página não os tem. O Build deriva-os do Deep teal. A página
  deve recebê-los depois, com o hex e o rácio.
- proposed: knowledge

## O hex do Orange text não é o do oklch

- where: `.icm/docs/brand.md`, "Derived steps", linha Orange text
- what: `oklch(0.511 0.118 51.2)` dá `#9A4F1B`. A página diz `#9A4F1A`. A diferença é de um passo
  no canal azul e não se vê.
- proposed: knowledge

## O hook route-request apontou para outro ticket

- where: o hook `route-request` (blueprint), nesta sessão em 2026-11-23
- what: O pedido foi "start work on JAM-481". O hook escreveu "Route: start JAM-290". O texto de
  contexto do pedido tinha as chaves JAM-292, JAM-480 a JAM-485 e os pull requests #277 e #278.
  A sessão seguiu o JAM-481, que é o comando do pedido.
- proposed: bug (blueprint)

## O Linear MCP não liga numa sessão lateral

- where: esta sessão, 2026-11-23
- what: O MCP do Linear não estava ligado. A sessão leu o ticket com
  `baxter_tool run linear get_issue` (só leitura). O ramo do run é
  `claude/jam-481-brand-palette-e50b9b`, o ramo do worktree, e não o `gitBranchName` do Linear
  (`contact/jam-481-agorasim-the-site-and-the-emails-use-the`), como nos runs irmãos.
- proposed: chore (blueprint)

## O hover do botão destrutivo fica abaixo de 4.5:1

- where: `web/src/components/ui/button.tsx`, variante `destructive`, `hover:bg-destructive/20`
- what: Com o vermelho novo, o texto sobre `bg-destructive/20` mede 4.08:1 sobre Off-white e
  4.51:1 sobre Paper. É um estado de hover, não o estado de repouso. O critério do ticket fala só
  de `bg-destructive/10`, que passa. Uma correção possível: `hover:bg-destructive/15`.
- proposed: tweak
