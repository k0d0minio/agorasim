# Spec: agorasim · The site and the emails use the brand palette

- ticket: JAM-481
- touches: web/src/app/globals.css, web/src/lib/email-layout.ts, web/src/app/[locale]/layout.tsx, web/src/app/admin/layout.tsx, web/public/admin-manifest.webmanifest, web/src/components/media.tsx
- complexity: standard

## Problem

O site, os emails e a consola de administração usam um verde de campo e um branco quente pálido.
A paleta nova da marca do cliente tem teal, areia, terracota, laranja queimado, lavanda e
off-white. As regras da marca estão em `.icm/docs/brand.md` (JAM-480), mas o site ainda não as
usa. O cliente Diogo quer ver a abordagem no UAT antes de decidir.

## Proposed change

O visitante vê o site com as cores da marca: fundo Off-white, cartões Paper, ligações e botões em
Deep teal, superfícies secundárias em Warm sand e texto Ink. Os emails de reserva e a consola de
administração mostram as mesmas cores. A barra do navegador no telemóvel e o ecrã de arranque da
consola têm a cor do fundo novo. Uma fotografia em falta mostra um gradiente com cores da paleta.
Não há ilustrações neste ticket.

Decisões desta spec:

- Cada token de `:root` recebe o valor do mapa de tokens de `.icm/docs/brand.md`, valor a valor.
  Os sete tokens `--brand-*` entram em `:root`, com um alias `--color-brand-*` em `@theme inline`.
- `--accent` é o Orange tint, não o Burnt orange sólido.
- `--destructive` muda de `oklch(0.53 0.19 27)` para `oklch(0.49 0.19 27)` (Q4). Com o valor de
  hoje, o texto em `bg-destructive/10` mede 4.16:1 sobre Off-white. O critério pede 4.5:1.
- `emailPalette` precisa de dois passos de teal que `brand.md` não tem: a faixa do email da equipa
  (`primaryDark`) e o fundo dos painéis de destaque (`primaryTint`). O Build deriva-os do Deep
  teal e mede o contraste de cada um. Ficam escritos no comentário de contraste.
- Os tokens `--sidebar-*` não são da marca (cinzento de origem do shadcn). Não mudam.
- O tipo de letra não muda: Fraunces e Geist.

Palavra do Jamie, no chat, em 2026-11-23: "Start the next set of parallel tickets please". Este
ticket é um deles. As perguntas Q1 a Q4 usam o default.

## Acceptance criteria

- [ ] Cada token de `:root` em `web/src/app/globals.css` tem o valor do mapa de tokens de `.icm/docs/brand.md`. Os tokens da marca existem como cores do Tailwind (`bg-brand-terracotta` e os outros seis). (verify: agent)
- [ ] `emailPalette` em `web/src/lib/email-layout.ts` tem as mesmas cores em hex, e o comentário de contraste tem os rácios novos. (verify: agent)
- [ ] `viewport.themeColor` nos dois layouts, e `background_color` e `theme_color` do manifesto da consola, têm o hex do fundo novo (`#F3E9D5`). (verify: agent)
- [ ] O texto `text-destructive` em `bg-destructive/10` mede 4.5:1 ou mais sobre o fundo novo e sobre os cartões. (verify: agent)
- [ ] A pré-visualização mostra a página inicial, uma página de experiência, o fluxo de reserva, um email de reserva e o início da consola com as cores novas, sem ilustrações. (verify: operator)
- [ ] Os checks de CI passam. (verify: CI)

## Out of scope

- As ilustrações: as orlas de colinas (JAM-482), as cenas (JAM-483), o 404, a confirmação e a faixa dos emails (JAM-484), os desenhos da frota (JAM-485).
- Os ficheiros brutos do designer em `web/public/images/` do checkout principal. Não entram no repositório (decisão D47).
- O tipo de letra.
- Uma paleta escura para a consola.
- Mudanças em componentes: um componente continua a usar `primary`, `secondary` e `muted`.
- A pergunta "o trabalho de marca faz parte do contrato atual" é do Jamie. Não bloqueia este run.
- O contacto com o cliente e a produção.

## Open questions

- none
