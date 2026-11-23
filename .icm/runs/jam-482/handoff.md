# Handoff jam-482

## Next action

O operador responde às perguntas Q1 a Q5 do pull request #281 (cartão no HUD, ou no corpo do pull
request). Depois diz `new JAM-482`. A sessão corre `.icm/_system/scripts/questions.sh JAM-482`,
põe as respostas em `spec.md`, faz commit e push, e corre
`.icm/_system/scripts/new-run.sh JAM-482 --refresh-body`.

Depois o operador marca **Spec approved** no pull request #281 e diz `build JAM-482`.

## How to test

Ainda não há nada para testar: o Define não escreve código. Depois do Build, abra a
pré-visualização num telemóvel e em desktop: a página inicial tem colinas no fundo do hero e à
volta da secção Experiências, a página Casamentos tem colinas nas secções em areia, e o rodapé
começa com uma faixa de quatro colinas.

## What was decided

- Origem: comando da sessão que abriu este run, em 2026-11-23: `start work on JAM-482`.
- Nenhuma pergunta tem resposta ainda. A spec está escrita com o default de cada uma.
- O ramo é `claude/jam-482-hill-edges-294d4f`, o ramo do worktree, como nos runs irmãos. Não é o
  `gitBranchName` do Linear (`contact/jam-482-agorasim-hill-edges-from-the-illustrations`).

## Notes for Build

- A cena de dia está no checkout principal do Jamie, não no repositório:
  `/home/jamie-nisbet/Desktop/Repositories/agorasim/web/public/images/wetransfer_ilustracao_sem_titulo-png_2026-11-18_1912/Ilustração_Sem_Título(1).png`
  (1091 × 1923). Tem cinco cores lisas: céu, areia, tan (duas formas), barro e castanho. Leia-a
  lá. Não a copie para o repositório. Se o Jamie a mover para o arquivo do negócio (decisão D47),
  peça o caminho novo.
- O plano e o esboço estático estão no checkout principal, não em git:
  `.icm/local/2026-11-22-brand-integration.md` (secção 5, `hills.tsx`) e
  `.icm/local/2026-11-22-brand-mockup/index.html`. O esboço usa tan e barro sobre a fotografia do
  hero. O ticket não permite: o hero usa só a cor do fundo da página.
- `Section muted` é `bg-secondary/30`, uma cor translúcida. A camada da frente de uma orla tem de
  ser opaca e dar a mesma cor que a secção, senão vê-se um degrau.
- No rodapé em Deep teal, `hover:text-primary`, `text-muted-foreground`, `border-border` e o anel
  de foco (`--ring` é Deep teal) deixam de se ver. Mude-os.
- Não há nenhum teste `.test.tsx` no repositório. Um teste de `Hills` só entra se o Vitest
  renderizar o componente sem uma dependência nova.
- A sessão do JAM-481 leu a pré-visualização do ramo no navegador da aplicação, sem o muro do
  Vercel: `agorasim-git-<ramo>-kodominio.vercel.app`.
- Se Q3 ficar no default (token `--brand-tan`), escreva um finding: `.icm/docs/brand.md` precisa
  da linha do tan (lane `knowledge`).

## Blockers

- O operador responde a Q1 a Q5 no pull request #281 e diz `new JAM-482`.
- O operador marca **Spec approved** no pull request #281.

## Do not touch

- `.icm/docs/brand.md` e os findings do run arquivado `jam-481`.
- Os ficheiros brutos do designer. Não entram no repositório.
- Os pull requests #277 (JAM-506, migração 0042) e #279 (JAM-292, migração 0043). Este ticket não
  tem migração.
- O Linear, o cliente e a produção.
