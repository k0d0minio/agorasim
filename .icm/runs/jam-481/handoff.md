# Handoff jam-481

## Next action

O operador lê a spec no pull request #280 e marca **Spec approved**. Depois diz `build JAM-481`.
O Build muda os seis ficheiros de `touches:` da spec e não toca noutro ficheiro.

## How to test

Ainda não há nada para testar: a fase Define não escreve código. Depois do Build, abra a
pré-visualização do pull request #280 e veja a página inicial, uma experiência, o fluxo de
reserva e `/admin` com fundo Off-white e botões em Deep teal.

## What was decided

- Palavra do Jamie, no chat, em 2026-11-23: "Start the next set of parallel tickets please".
  Este ticket é um deles. O run começa com os defaults e não espera pelo cliente.
- Q1 a Q3 são as perguntas do ticket. Usam o default, que é o de `.icm/docs/brand.md`: fundo
  Off-white com cartões Paper, a consola usa os mesmos tokens, e teal, areia e terracota são as
  três cores principais.
- Q4 é nova. Com o `--destructive` de hoje, `oklch(0.53 0.19 27)` (`#C22826`), o texto em
  `bg-destructive/10` mede 4.16:1 sobre Off-white, 4.62:1 sobre Paper e 3.60:1 sobre Warm sand.
  O default escurece o vermelho para `oklch(0.49 0.19 27)` (`#B31319`): 4.86:1 sobre Off-white,
  5.40:1 sobre Paper, 4.19:1 sobre Warm sand, e texto branco sobre o vermelho 6.92:1.
- O Jamie pode mudar cada resposta no corpo do pull request, no gate Spec approved.

## Notes for Build

- Os valores oklch de `brand.md` dão o hex da tabela da paleta. Uma exceção: Orange text
  `oklch(0.511 0.118 51.2)` dá `#9A4F1B`, não `#9A4F1A`. Use o oklch no CSS.
- `emailPalette` tem quatro chaves sem linha no mapa de tokens: `primaryDark`, `primaryTint`,
  `sand` e `onSand`. `sand` é Warm sand e `onSand` é Ink. `primaryDark` e `primaryTint` são passos
  derivados do Deep teal: meça o contraste de cada um e escreva-o no comentário.
- Veja onde `bg-destructive/10` fica sobre uma superfície `muted` ou `secondary` (Warm sand): aí
  o vermelho novo mede 4.19:1. Se existir um caso, é um finding ou uma correção deste run.
- O gradiente de `media.tsx` usa hoje um `hue` que vem do `seed`. O Build troca-o por passos da
  paleta e mantém o gradiente determinístico por `seed`.
- Verifique no preview: o hover do menu móvel, as faixas de aviso, o select e o calendário do
  seletor de datas (o `--accent` novo), e as fotografias de tons frios sobre Off-white.

## Blockers

- none

## Do not touch

- Os ficheiros brutos do designer em `web/public/images/` do checkout principal (decisão D47).
- O tipo de letra, os componentes, e os ficheiros dos tickets JAM-482 a JAM-485.
- `web/drizzle/`, `web/src/lib/fleet.ts` e os ficheiros de reserva dos pull requests #277 e #278.
