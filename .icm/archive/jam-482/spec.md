# Spec: agorasim · Hill edges from the illustrations join the sections, the hero and the footer

- ticket: JAM-482
- touches: web/src/components/brand/hills.tsx, web/src/components/section.tsx, web/src/components/hero.tsx, web/src/components/site-footer.tsx, web/src/app/[locale]/page.tsx, web/src/app/[locale]/casamentos/page.tsx, web/src/app/globals.css
- complexity: standard

## Problem

O site já usa a paleta da marca (JAM-481), mas ainda não tem nenhum elemento das ilustrações do
cliente. As secções juntam-se com linhas retas e o rodapé começa com um traço. As regras da marca
(`.icm/docs/brand.md`) pedem orlas de colinas entre secções, no fundo do hero da página inicial e
no topo do rodapé. As orlas dão a marca a cada página sem tocar numa fotografia.

## Proposed change

O visitante vê colinas em camadas, com as curvas da cena de dia do designer, em quatro sítios:

1. **Hero da página inicial.** Uma orla de colinas ao longo do fundo do hero, só na cor do fundo
   da página. A fotografia e o vídeo não mudam. Não há cena nem veículo no hero.
2. **Página inicial.** Uma orla à entrada e outra à saída da secção Experiências.
3. **Casamentos.** Uma orla à entrada e outra à saída das secções em areia (Q5). As fotografias
   de casamento não mudam.
4. **Rodapé, em todas as páginas do site público.** Uma faixa de quatro colinas no topo: areia,
   tan, terracota e teal. A última colina é o próprio rodapé.

Decisões desta spec (o default de cada pergunta do pull request):

- **Componente novo `Hills`** (`web/src/components/brand/hills.tsx`): SVG inline, 2 a 4 camadas,
  `aria-hidden`, orla de topo ou de fundo. A camada da frente tem a cor exata da secção que se
  segue. As cores vêm dos tokens. Nenhum hex e nenhum `oklch()` num componente.
- **Curvas.** O Build traça o contorno de cima de cada colina da cena de dia (cada colina é uma
  cor lisa) e simplifica-o para um caminho cúbico. A cena tem quatro colinas: areia, tan, barro e
  castanho. A faixa do rodapé usa as quatro, pela mesma ordem. As outras orlas usam um
  subconjunto. O ficheiro vetorial do designer substitui o traçado mais tarde.
- **Hero (Q4).** Três camadas na cor do fundo da página. As duas de trás são translúcidas, a da
  frente é opaca. A orla tem 70 px de altura no máximo em qualquer largura, e menos no telemóvel.
  Não tapa o texto nem os botões do hero.
- **Faixa dos carros por baixo do hero (Q2).** A faixa passa de areia para a cor do fundo da
  página, para a colina da frente se tornar a faixa. Mantém a linha de baixo.
- **Secções.** `Section` recebe uma orla opcional no topo, no fundo, ou nos dois. Sem a opção,
  uma secção fica igual a hoje. Cada orla de secção tem 2 camadas: a de trás em Warm sand, a da
  frente na cor da secção que se segue.
- **Rodapé (Q1).** O rodapé passa a Deep teal, com o nome em Warm sand e o texto em Off-white,
  como a tabela de `.icm/docs/brand.md` diz. A faixa substitui o traço de cima. Os ícones, as
  ligações, o texto pequeno e as linhas internas mudam de cor para se lerem sobre teal. O estado
  de hover e o anel de foco também: hoje são Deep teal e ficariam invisíveis.
- **Tan (Q3).** A paleta não tem o tan da cena de dia. O Build lê a cor na cena e cria o token
  `--brand-tan` em `globals.css`, com o alias `--color-brand-tan`. A linha do tan em
  `.icm/docs/brand.md` não é deste run: fica como finding para a lane `knowledge`.
- **Onde aparece a faixa do rodapé.** Em todas as páginas que têm o rodapé, incluindo as páginas
  de experiência e os passos da reserva. O ticket diz que as orlas dão a marca a cada página. A
  faixa fica no rodapé, longe de qualquer fotografia. A consola de administração não tem rodapé e
  não recebe nada.
- **Sem saltos de layout.** Cada SVG tem altura fixa em CSS e vem no HTML do servidor. Não há
  JavaScript de cliente novo.
- **Sem texto novo.** As orlas são decorativas. Não há texto em pt nem em en para sincronizar.

Origem: comando da sessão que abriu este run, em 2026-11-23: `start work on JAM-482`. O JAM-481
(paleta) está em `main` desde 2026-11-23 (`ecbcae1`).

## Acceptance criteria

- [ ] Na página inicial, a orla do hero ocupa os 70 px de baixo do hero ou menos, a 375 px e a 1280 px de largura, e usa só a cor do fundo da página. Não tapa o texto nem os botões do hero. (verify: agent)
- [ ] Cada SVG de colinas tem `aria-hidden="true"`, não recebe foco e não tem texto. (verify: agent)
- [ ] A página inicial e a página Casamentos carregam com um layout shift acumulado de 0 causado pelas orlas, a 375 px e a 1280 px. (verify: agent)
- [ ] A 375 px e em desktop, não se vê nenhuma linha de falha nem degrau de cor entre uma colina e a sua secção, na página inicial, em Casamentos e no rodapé. (verify: operator)
- [ ] A página inicial mostra uma orla à entrada e outra à saída da secção Experiências. A página Casamentos mostra orlas nas secções em areia. As fotografias das duas páginas estão iguais a antes. (verify: operator)
- [ ] O rodapé mostra a faixa de quatro colinas (areia, tan, terracota, teal) na pré-visualização, em todas as páginas do site público, e a silhueta segue as colinas da cena de dia. (verify: operator)
- [ ] No rodapé em Deep teal, cada texto mede 4.5:1 ou mais, e o anel de foco de uma ligação mede 3:1 ou mais contra o fundo. (verify: agent)
- [ ] Uma secção sem a opção de orla, numa página que não é a inicial nem Casamentos, está igual a antes. (verify: agent)
- [ ] Os checks de CI passam. (verify: CI)

## Out of scope

- As cenas ilustradas e a faixa Terracota das avaliações (JAM-483).
- O 404, a confirmação da reserva e a faixa dos emails (JAM-484). Os desenhos da frota (JAM-485).
- Orlas noutras páginas (Sobre, Eventos, Experiências, Contactos, blog). Só a página inicial e Casamentos, mais o rodapé.
- A consola de administração e os emails.
- Mudanças a `.icm/docs/brand.md`, incluindo os findings do run `jam-481`. Um run não escreve na pasta dos docs.
- Os ficheiros brutos do designer. Não entram no repositório (decisão D47). O Build lê a cena de dia no checkout principal e escreve só os caminhos do traçado.
- O ficheiro vetorial do designer. Substitui o traçado num ticket futuro.
- Uma migração de base de dados. Este ticket não tem nenhuma.
- O contacto com o cliente e a produção.

## Open questions

- none
