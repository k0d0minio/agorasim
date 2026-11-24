# Handoff jam-482

## Next action

O operador testa a pré-visualização e marca **Ready to merge** no pull request #281. Depois diz
`release JAM-482`.

## How to test

Abra a pré-visualização (https://agorasim-git-claude-jam-482-hill-edges-294d4f-kodominio.vercel.app/pt)
num telemóvel e em desktop. A página inicial tem colinas claras no fundo do hero e à volta da
secção Experiências, e a página Casamentos tem colinas à volta de "Como funciona" e do pedido de
orçamento. O rodapé de qualquer página começa com quatro colinas (areia, tan, terracota, teal) e
é teal: não deve ver nenhuma linha entre uma colina e a sua secção.

## Acceptance criteria

Lidos na pré-visualização do ramo em 2026-11-24, no commit `7b021bb`.

- Critério 1, orla do hero: cumprido. A orla tem 70 px a 1280 px e 40 px a 375 px. As três
  camadas têm a cor de `--background` (opacidade 0.35, 0.6 e 1). O último botão do hero acaba
  27 px acima da orla em desktop e 57 px acima no telemóvel.
- Critério 2, leitores de ecrã: cumprido. Cada SVG de colinas tem `aria-hidden="true"` e
  `focusable="false"`, não tem `tabindex`, nem texto, nem `title`.
- Critério 3, layout shift: cumprido para as orlas. Nenhuma orla aparece como origem de um
  shift. A página mede 0.40 a 1280 px e 0.41 a 375 px, e a única origem é o rodapé, que desce
  quando o conteúdo chega. O UAT mede o mesmo sem este run (0.40 e 0.41). Está em `findings.md`.
- Critério 4, linhas de falha: para o operador. O agente não viu nenhuma linha em capturas a
  375 px e a 1280 px, na página inicial, em Casamentos e no rodapé. A cor da camada da frente é
  igual à cor calculada da secção seguinte em todas as orlas.
- Critério 5, orlas nas páginas: para o operador. A página inicial tem 2 orlas de secção
  (Experiências) e a orla do hero. Casamentos tem 4 orlas (2 secções em areia). Nenhum
  componente de fotografia mudou.
- Critério 6, faixa do rodapé: para o operador. A faixa tem 4 camadas (Warm sand, tan,
  Terracotta, Deep teal), 90 px em desktop e 56 px no telemóvel, e aparece em `/pt`,
  `/pt/casamentos`, `/pt/sobre` e `/pt/experiencias`.
- Critério 7, contraste do rodapé: cumprido. O nome mede 6.92:1, o resto do texto e os ícones
  5.78:1, sobre Deep teal. O anel de foco de uma ligação é Off-white, sólido, 2 px: 8.08:1.
- Critério 8, secções sem orla: cumprido. `Section` sem `edge` devolve o mesmo HTML de antes.
  `/pt/sobre` tem as mesmas classes de secção que o UAT, e nenhuma orla fora do rodapé.
- Critério 9, CI: cumprido. CI GREEN em `7b021bb`.

## What was decided

- Palavra do Jamie, no chat, em 2026-11-24: "build". Spec approved estava marcado. Q1 a Q5
  estavam em `_waiting_`. O Build usou o default de cada uma, como a spec aprovada diz:
  rodapé em Deep teal (Q1), faixa dos carros na cor do fundo (Q2), token `--brand-tan` (Q3),
  3 camadas no hero (Q4), as 2 secções em areia de Casamentos (Q5).
- As curvas são o traçado da cena de dia: o contorno de cima de cada uma das quatro cores lisas,
  em 17 pontos, ligados por curvas cúbicas. Estão em `web/src/components/brand/hills.tsx`.
- `--brand-tan` é `oklch(0.797 0.081 69.3)`, `#DFB484`, a cor lida na cena.
- Uma secção com orla usa a cor opaca `color-mix(in srgb, var(--secondary) 30%, var(--background))`
  em vez de `bg-secondary/30`. É a mesma cor à vista. A colina da frente tem de ser opaca.
- Orlas de secção: 56 px em desktop, 32 px no telemóvel. A orla de saída é o espelho da de entrada.
- O rodapé mantém a margem `mt-24`. Uma margem menor fazia crescer o shift que já existe.
- Não há teste unitário de `Hills`: o Vitest deste repositório não renderiza componentes.
- A sessão não editou o corpo do pull request: as perguntas continuam em `_waiting_` lá.

## Blockers

- O operador marca **Ready to merge** no pull request #281.

## Do not touch

- `.icm/docs/brand.md`. A linha do tan é um finding para a lane `knowledge`.
- Os ficheiros brutos do designer. Não entram no repositório.
- O pull request #279 (JAM-292, migração 0043). Este ticket não tem migração.
- O Linear, o cliente e a produção.
