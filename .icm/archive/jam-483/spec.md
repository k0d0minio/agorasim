# Spec: agorasim · One illustrated scene frames the story on Home, Sobre and Eventos

- ticket: JAM-483
- touches: web/public/images/brand/scene-sunset-2cv.webp, web/public/images/brand/scene-night-van.webp, web/public/images/brand/scene-day-hills.webp, web/src/content/brand.ts, web/src/components/brand/scene.tsx, web/src/components/brand/brand-imports.test.ts, web/src/components/testimonials.tsx, web/src/app/[locale]/experiencias/[slug]/page.tsx, web/src/app/[locale]/page.tsx, web/src/app/[locale]/sobre/page.tsx, web/src/app/[locale]/eventos/page.tsx
- complexity: standard

## Problem

O site já tem a paleta (JAM-481) e as orlas de colinas (JAM-482), mas as três ilustrações do
designer ainda não aparecem em nenhuma página. O cliente quer que as ilustrações definam a marca e
complementem as fotografias, sem as substituir. As fotografias reais continuam a ser o elemento
principal de venda. A faixa das avaliações ainda não tem a cor da história (Terracota).

## Proposed change

O visitante vê uma cena ilustrada, no máximo, em três páginas de história. As fotografias ficam
em todas as posições de venda.

1. **Página inicial, secção Intro.** A cena do pôr do sol com o 2CV fica ao lado do texto, em
   duas colunas a partir de `md`. No telemóvel a cena fica por baixo do texto.
2. **Sobre.** A primeira fotografia fica. A cena do pôr do sol fica ao lado do texto do corpo da
   primeira secção. O texto do corpo separa a fotografia da cena.
3. **Eventos.** Uma faixa nova na cor Night (`#1B0A14`), entre a secção de abertura e o pedido
   de orçamento. A faixa tem a cena da noite com a carrinha VW T3 e o cão, e um eyebrow em
   Dusty lavender (Q2).
4. **Avaliações, na página inicial e nas páginas de experiência (Q1).** A faixa passa a
   Terracota. O título, a introdução e a ligação de avaliação do Google ficam em Off-white
   (7.00:1). Os cartões das avaliações e as fotografias dos hóspedes ficam iguais. A faixa é uma
   cor, não uma ilustração: a regra "nenhuma cena numa página de venda" fica.

Respostas do Jamie no chat da sessão da fila, 2026-11-24: Q1 "home and the experience pages",
Q2 o eyebrow só, Q3 4:3.

Decisões desta spec:

- **Ficheiros das cenas (Q3).** Três recortes em paisagem 4:3, em WebP, cada um com menos de
  300 KB: `scene-sunset-2cv.webp` (2400 px de largura, do PNG de 6546 px),
  `scene-night-van.webp` e `scene-day-hills.webp` (1091 px, o limite da fonte). O Build lê os
  PNG brutos no checkout principal do Jamie e só escreve os recortes. Os ficheiros brutos não
  entram no repositório e não mudam de lugar (decisão D47).
- **A cena de dia.** O ticket pede o ficheiro e o registo. Nenhuma página a mostra neste run. Fica
  pronta para um ticket futuro.
- **Registo `web/src/content/brand.ts`.** Cada cena tem `src`, largura, altura, texto alternativo
  em pt e em en, e ponto focal.
- **Componente `Scene`** (`web/src/components/brand/scene.tsx`). Mostra uma cena com
  `next/image`, com `sizes`, cantos arredondados e o ponto focal. Sem `priority`. Não aceita
  `children` nem uma fotografia. A opção `decorative` dá `alt=""`.
- **Teste de importação.** Um teste vitest lê os ficheiros de `web/src/app/` e falha se um
  ficheiro de `app/[locale]/experiencias/`, de `app/[locale]/reservar/` (exceto `confirmacao`) ou
  de `app/admin/` importa `@/components/brand/scene` ou `@/components/brand/spot`.
- **Foco na faixa Terracota.** Uma ligação na faixa tem texto e anel de foco em Off-white, que
  se lê sobre Terracota.
- **Texto novo.** O texto alternativo das cenas e o eyebrow de Eventos, em pt-PT e em en, no
  mesmo pull request.

Origem: a fila do Jamie de 2026-11-24 ("2 tickets that would actually bring value"). O plano de
2026-11-22 e `.icm/docs/brand.md` dão a colocação (opção B, "Framed").

## Acceptance criteria

- [ ] Cada ficheiro de cena em `web/public/images/brand/` tem menos de 300 KB, é paisagem, e tem texto alternativo em pt e em en no registo. (verify: agent)
- [ ] A página inicial, Sobre e Eventos mostram uma cena cada, e nenhuma outra página mostra uma cena. (verify: agent)
- [ ] Nenhuma cena fica sobre, atrás ou encostada a uma fotografia, a 375 px e a 1280 px. (verify: operator)
- [ ] A primeira fotografia de Sobre e a fotografia de Eventos estão iguais a antes. (verify: operator)
- [ ] O teste de importação corre no CI e falha quando uma página de venda importa `Scene`. (verify: CI)
- [ ] A faixa das avaliações é Terracota na página inicial e nas páginas de experiência, e o seu texto Off-white mede 7.00:1. As fotografias dos hóspedes ficam iguais. (verify: agent)
- [ ] Nenhuma cena tem `priority`, e a página inicial não tem novo layout shift causado por uma cena. (verify: agent)
- [ ] O eyebrow de Eventos e o texto alternativo das cenas existem em pt-PT e em en. (verify: agent)
- [ ] Os checks de CI passam. (verify: CI)

## Out of scope

- O componente `Spot`, o 404, a confirmação da reserva e os emails (JAM-484).
- Os desenhos da frota (JAM-485).
- Uma cena noutras páginas, ou a cena de dia numa página.
- Mover ou apagar os ficheiros brutos do designer. É um ato do Jamie (D47).
- Os ficheiros em paisagem do designer. Substituem os recortes num ticket futuro.
- Mudanças a `.icm/docs/brand.md`.
- O layout shift do rodapé no carregamento (o lote de correções).
- A base de dados, o contacto com o cliente e a produção.

## Open questions

- none
