# Handoff jam-483

## Next action

O operador testa a pré-visualização do pull request #284 e marca **Ready to merge**. Depois diz
`release JAM-483`.

## What changed

- Três recortes 4:3 em `web/public/images/brand/`: `scene-sunset-2cv.webp` (2400 × 1800, 80 KB),
  `scene-night-van.webp` (1091 × 818, 32 KB) e `scene-day-hills.webp` (1091 × 818, 7 KB). Os
  ficheiros brutos ficam onde estavam, fora do git.
- `web/src/content/brand.ts`: o registo das cenas. `web/src/components/brand/scene.tsx`: o
  componente. `web/src/components/brand/brand-imports.test.ts`: o teste de importação e o teste
  dos ficheiros (tamanho, paisagem, texto alternativo).
- Página inicial e Sobre: a cena do pôr do sol ao lado do texto. Eventos: a faixa Night com o
  eyebrow e a cena da noite, entre a abertura e o pedido de orçamento.
- `testimonials.tsx` e `google-reviews.tsx`: a faixa das avaliações é Terracota em todo o lado
  (Q1). As páginas de experiência mostram `GoogleReviews` quando o Google dá avaliações, por isso
  as duas mudaram. A opção `muted` saiu.
- `SectionHeading` e `GoogleRatingLink` têm a opção `onTerracotta`: eyebrow Warm sand, título,
  introdução e ligação Off-white, e contorno de foco Off-white na ligação.
- O eyebrow de Eventos está em `web/src/content/pages.ts` (`events.nightBand`), com o resto do
  texto da página. A spec não nomeava este ficheiro.

## Acceptance criteria

Lidos na pré-visualização em 2026-11-24.

- Critério 1, ficheiros: cumprido. 80 KB, 32 KB e 7 KB, 4:3, texto alternativo pt e en. O teste
  do CI verifica-o.
- Critério 2, uma cena por página: cumprido. `/pt`, `/en`, `/pt/sobre`, `/en/sobre`,
  `/pt/eventos` e `/en/eventos` têm uma cena cada. `/pt/casamentos`, `/pt/contactos`,
  `/pt/reservar` e `/pt/experiencias/rural-saloia` não têm nenhuma.
- Critério 3, nenhuma cena encostada a uma fotografia: para o operador. Em Sobre, no telemóvel, o
  texto do corpo separa a primeira fotografia da cena (428 px), e o título "Os nossos clássicos"
  separa a cena das fotografias da frota.
- Critério 4, fotografias de Sobre e Eventos: para o operador. O código destas fotografias não
  mudou.
- Critério 5, teste de importação: cumprido pelo CI verde.
- Critério 6, faixa Terracota: cumprido. A faixa da página inicial e a da Rural Saloia usam o
  token Terracota. O título e o texto são Off-white (7.00:1), o eyebrow é Warm sand (6.00:1).
- Critério 7, sem `priority` e sem layout shift: cumprido. Cada cena tem `loading="lazy"` e
  nenhum `fetchpriority`. Sobre mede um layout shift de 0 a 375 px.
- Critério 8, texto pt e en: cumprido. "Noites para recordar" / "Nights to remember".
- Critério 9, CI: verde.

## How to test

Abra a pré-visualização (https://agorasim-et6eryrny-kodominio.vercel.app/pt) no telemóvel e em
desktop. A página inicial e Sobre têm o 2CV ao pôr do sol ao lado do texto, Eventos tem a
carrinha e o cão numa faixa escura, e as avaliações estão numa faixa terracota. Confirme que
nenhuma ilustração fica colada a uma fotografia.

## Blockers

- O operador marca Ready to merge.

## Do not touch

- Os ficheiros brutos do designer.
