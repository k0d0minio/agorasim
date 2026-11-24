# Spec: agorasim · The 404, the booking confirmation and the emails carry the brand drawing

- ticket: JAM-484
- touches: web/src/components/brand/spot.tsx, web/public/images/brand/spot-van-dog.webp, web/public/images/brand/email-header-hills.png, web/src/app/[locale]/not-found.tsx, web/src/app/[locale]/reservar/confirmacao/page.tsx, web/src/lib/email-layout.ts, web/public/images/README.md
- complexity: standard

## Problem

O JAM-483 pôs a cena ilustrada na Home, em Sobre e em Eventos. A página 404, a confirmação
da reserva e os emails da reserva ainda não têm o desenho da marca. Estes são os momentos em
que o cliente está perdido ou acabou de pagar: a marca deve estar presente, sem competir com
as fotografias reais.

## Proposed change

- Um desenho pequeno da marca (no máximo 240 px de largura), com uma legenda opcional: a
  carrinha VW T3 com o Jack Russell no tejadilho, recortada em fundo transparente.
- A página 404 mostra a carrinha e o cão acima do texto que tem hoje, em PT e em EN.
- A página de confirmação mostra o desenho acima do agradecimento. Num telemóvel de 375 px,
  os detalhes da reserva continuam visíveis sem deslizar.
- Os emails da reserva têm uma faixa de colinas no topo (PNG de 1200 × 120, porque o Outlook
  não mostra WebP), por baixo ou à volta do logótipo que já existe.

## Acceptance criteria

- [ ] A página 404, em `/pt` e em `/en`, mostra a carrinha com o cão e o texto bilingue de hoje. (verify: agent)
- [ ] A confirmação mostra o desenho acima do agradecimento, e num ecrã de 375 × 667 os detalhes da reserva aparecem sem deslizar. (verify: agent)
- [ ] O desenho tem no máximo 240 px de largura, tem texto alternativo, e é decorativo para o leitor de ecrã quando não tem legenda. (verify: agent)
- [ ] O email de confirmação mostra a faixa de colinas no Gmail web, no Apple Mail e no Outlook. (verify: operator)
- [ ] A imagem da faixa tem um URL absoluto, como o logótipo, e o email continua legível com as imagens bloqueadas. (verify: agent)
- [ ] Os testes dos emails e o lint passam. (verify: CI)

## Out of scope

- Outras páginas além da 404 e da confirmação.
- O conteúdo e o envio dos emails (o JAM-513 muda o envio para o Resend mais tarde).
- Os ficheiros originais em `brand/source/`: ficam fora do git.
- Mudar as cores ou a paleta de `web/src/content/brand.ts`.

## Open questions

- Q1 e Q2 em `questions.md`. Os valores por defeito estão lá.
- O JAM-513 vai mexer no código dos emails perto de `email-layout.ts`. Esta mudança fica só no
  cabeçalho do layout, para o conflito ser pequeno.
