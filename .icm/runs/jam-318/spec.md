# Spec: agorasim · The Sales board shows every stage at the top, and Rita opens one with a tap

- ticket: JAM-318
- touches: web/src/components/admin/sales-stage-pager.tsx, web/src/components/admin/sales-board.tsx, web/src/app/admin/sales/page.tsx, .icm/intake/triage/sales-board-stage-shortcuts.md
- complexity: standard

## Problem

De `md` para cima, `/admin/sales` empilha as fases uma por baixo da outra
(`sales-stage-pager.tsx`, desde o #237). Em UAT a 1024 px, "Reservado" começa a cerca de
2 270 px numa página de 4 240 px. A Rita tem de passar por "Novo", "Contactado" e
"Orçamentado" para lá chegar. O pedido é da Rita, na ronda 2 de feedback (2026-11-12).

## Proposed change

O topo do quadro de Vendas mostra um controlo por fase, com a sua contagem: Novo,
Contactado, Orçamentado, Reservado, Arquivado. Os controlos aparecem em todas as larguras e
têm o mesmo aspeto no telemóvel e nos ecrãs maiores.

- Um toque num controlo mostra essa fase. De `md` para cima, o quadro mostra só a fase
  escolhida, com a sua grelha de cartões (resposta por omissão da pergunta Q1).
- O quadro abre em "Novo" quando o endereço não nomeia uma fase. O endereço
  `/admin/sales?fase=<fase>` continua a abrir o quadro nessa fase, porque os cartões de
  acesso rápido do início da consola usam-no.
- No telemóvel, o carril de fases e o deslizar entre fases ficam como estão hoje.
- De `md` para cima, os controlos ficam fixos por baixo da barra da aplicação enquanto a
  página desliza, como no telemóvel.
- Uma fase sem pedidos mantém o seu controlo, com a contagem 0, e mostra a mensagem de fase
  vazia que existe hoje.
- A contagem de cada controlo é o total verdadeiro da fase, como hoje, e não o número de
  cartões carregados.
- A pesquisa (`?q=`) não muda: mostra a lista de resultados, sem os controlos de fase.

O pull request move o stub `.icm/intake/triage/sales-board-stage-shortcuts.md` para a pasta
`_done/` (`.icm/local/ROUTES.md`).

## Acceptance criteria

- [ ] A 1024 px e acima, as cinco fases e as suas contagens estão visíveis no topo de `/admin/sales` sem deslizar a página. (verify: operator)
- [ ] Um toque numa fase mostra primeiro os cartões dessa fase, logo por baixo dos controlos, sem deslizar pelas outras fases. (verify: operator)
- [ ] `/admin/sales` sem `?fase=` abre em "Novo". (verify: operator)
- [ ] `/admin/sales?fase=reservado` abre em "Reservado", e o cartão de acesso rápido do início da consola continua a abrir a sua fase. (verify: operator)
- [ ] A 375 px, o quadro mantém o deslizar entre fases, e os controlos de fase têm o mesmo aspeto que a 1024 px. (verify: operator)
- [ ] Tab chega a cada controlo, e Enter ou Espaço escolhe a fase. (verify: agent)
- [ ] O controlo da fase escolhida tem `aria-current`, e cada contagem tem um nome que um leitor de ecrã diz ("3 registos"). (verify: agent)
- [ ] Uma fase com 0 pedidos mostra o controlo com "0" e a mensagem de fase vazia. (verify: agent)
- [ ] A página não tem deslocamento horizontal a 375 px, 768 px e 1024 px. (verify: agent)
- [ ] O stub está em `.icm/intake/triage/_done/sales-board-stage-shortcuts.md`. (verify: agent)
- [ ] Os checks `lint`, `typecheck` e `test` passam. (verify: CI)

## Out of scope

- Guardar a fase escolhida no endereço depois de um toque. Um recarregamento volta a "Novo", ou à fase de `?fase=`.
- Mudar os cartões, o seletor de estado de um cartão, ou o limite de cartões por fase (`SALES_STAGE_LIMIT`).
- Mudar a pesquisa de pedidos ou a exportação.
- Mudar os nomes, a ordem ou as descrições das fases.
- Restaurar o ramo ou o código do pull request #249.
- Mudanças em dados, autenticação ou pagamentos.

## Open questions

- A largura entre 768 px e 1023 px segue a mesma regra que 1024 px: os controlos no topo e uma fase de cada vez. O ticket só pede o critério a 1024 px e acima.
- O valor exato de `?fase=` para "Reservado" é o de `requestStatusParam.booked` em `web/src/lib/admin-format.ts`. Build confirma-o.
