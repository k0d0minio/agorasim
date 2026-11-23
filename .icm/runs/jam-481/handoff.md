# Handoff jam-481

## Next action

O operador testa a pré-visualização e marca **Ready to merge** no pull request #280. Depois diz
`release JAM-481`.

## How to test

Abra a pré-visualização (https://agorasim-git-claude-jam-481-brand-palette-e50b9b-kodominio.vercel.app) num telemóvel: a página inicial, uma experiência, o primeiro passo
de `/reservar` e `/admin` têm fundo Off-white, botões em Deep teal e cartões Paper. Faça uma
reserva de teste e veja o email: botão e ligações em Deep teal, contactos em Warm sand.

## Acceptance criteria

- Critério 1, tokens: cumprido. Na pré-visualização, cada token de `:root` dá o hex do mapa de
  `.icm/docs/brand.md` (lido com o canvas do navegador em 2026-11-23). Os sete aliases
  `--color-brand-*` estão em `@theme inline`. O Tailwind gera a classe quando um componente a usa.
- Critério 2, emails: cumprido. `emailPalette` tem o hex dos tokens e dois passos derivados do
  Deep teal: `primaryDark` `#0D373B` (Off-white sobre ele 10.71:1) e `primaryTint` `#DBECED`
  (Deep teal sobre ele 7.99:1). O comentário tem os rácios novos.
- Critério 3, cor do navegador e manifesto: cumprido. A pré-visualização serve `#F3E9D5` no
  `theme-color` do site e de `/admin`, e no `background_color` e `theme_color` do manifesto.
- Critério 4, `bg-destructive/10`: cumprido. `--destructive` é `#B31319`. Na pré-visualização o
  texto mede 4.89:1 sobre Off-white e 5.41:1 sobre Paper.
- Critério 5, pré-visualização: para o operador. A página inicial foi vista pelo agente com fundo
  Off-white e botões em Deep teal. O email não foi visto: precisa de uma reserva de teste.
- Critério 6, CI: cumprido. CI GREEN em f5350d1.

## What was decided

- Palavra do Jamie, no chat, em 2026-11-23: "Start the next set of parallel tickets please".
  Q1 a Q4 usam o default. O Jamie marcou Spec approved e disse "Build" em 2026-11-23.
- Q4: `--destructive` passa de `oklch(0.53 0.19 27)` para `oklch(0.49 0.19 27)`.
- O gradiente de `media.tsx` escolhe um de quatro gradientes da paleta pelo `seed`. Cada um acaba
  numa cor escura, para a etiqueta branca continuar legível.
- Os tokens `--sidebar-*` não mudaram: não são da marca e nenhum componente da consola os usa
  para cor visível.

## Blockers

- none

## Do not touch

- Os ficheiros brutos do designer em `web/public/images/` do checkout principal (decisão D47).
- O tipo de letra e os ficheiros dos tickets JAM-482 a JAM-485.
