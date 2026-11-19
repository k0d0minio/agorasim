# Handoff jam-318

## Next action

1. O operador testa a mudança na preview do pull request #260.
2. O operador marca **Ready to merge** no pull request #260, ou no cartão do HUD.
3. O operador diz `release JAM-318`.

Build está feito. CI está verde no commit 6d8ca06 (`code`, `icm-check`, `release`, `secrets`,
`workflows`, Vercel). A mudança está em `web/src/components/admin/sales-stage-pager.tsx`.
`sales-board.tsx` mudou só no comentário. `page.tsx` não mudou.

## How to test

Entrar na consola da preview e abrir `/admin/sales` a 1024 px: os cinco controlos de fase com
as contagens estão no topo, e o quadro mostra "Novo". Tocar em "Reservado": os cartões de
"Reservado" aparecem logo por baixo dos controlos. Abrir a 375 px: os mesmos controlos, e o
deslizar entre fases funciona.

## Criteria

Nenhum critério foi visto na preview por um agente: a preview pede o início de sessão da
Vercel e depois o da consola, e um agente não inicia sessão.

| # | Critério | Estado |
|---|---|---|
| 1 | Cinco fases e contagens visíveis a 1024 px sem deslizar | operador |
| 2 | Um toque mostra os cartões da fase logo por baixo dos controlos | operador |
| 3 | Sem `?fase=`, abre em "Novo" | operador |
| 4 | `?fase=reservado` abre em "Reservado" (`requestStatusParam.booked` é `reservado`, confirmado no código) | operador |
| 5 | A 375 px mantém o deslizar, e os controlos têm o mesmo aspeto | operador |
| 6 | Tab chega a cada controlo, Enter ou Espaço escolhe | só lido no código: cada controlo é um `<button>`. Não visto na preview |
| 7 | `aria-current` na fase escolhida, e a contagem tem nome ("3 registos") | só lido no código. Não visto na preview |
| 8 | Fase com 0 pedidos mostra "0" e a mensagem de fase vazia | só lido no código: essa parte não mudou. Não visto na preview |
| 9 | Sem deslocamento horizontal a 375, 768 e 1024 px | não verificado |
| 10 | O stub está em `.icm/intake/triage/_done/` | cumprido (commit no ramo) |
| 11 | `lint`, `typecheck` e `test` passam | cumprido (CI verde) |

O operador vê os critérios 6 a 9 no seu teste: Tab e Enter nos controlos, uma fase com 0, e
nenhuma barra de deslocamento horizontal.

Um comportamento que a spec não nomeia: de `md` para cima, um toque num controlo quando a
página está deslizada para baixo volta ao topo do quadro. Serve o critério 2.

## Blockers

- A caixa **Ready to merge** do pull request #260 espera o operador.
- Não há imagens de antes e depois: `findings.md` diz porquê.

## Do not touch

- Os ficheiros das sessões paralelas: JAM-317, JAM-319 e JAM-321.
