# Handoff jam-475

## Next action

O operador responde a Q1 e Q2 no corpo do pull request #272. Depois lê a página
`.icm/docs/blog-loop.md` e marca **Ready to merge**. Os bilhetes B1 a B6 da página são
propostas. O BAXTER cria-os no Linear, se o Jamie disser que sim.

## How to test

Abra `.icm/docs/blog-loop.md` no pull request. Leia "What stops the first articles" e "The
build plan". Cada caminho de ficheiro da página existe, exceto `workspaces/geo-content/topics.md` (proposto em B1).

## Blockers

- Q1 e Q2 esperam resposta (`blocked: yes` em `status.md`). Q1 é uma pergunta para a Diogo e
  a Rita. Os valores por omissão: 2 artigos por mês, e um trabalho agendado abre um pull
  request de rascunhos todos os meses.
- O critério 1 do bilhete (três rascunhos em PT e EN no Blog studio de UAT) não está feito.
  Razões: o portão da fase 01 em
  `workspaces/geo-content/stages/01_research/output/research.md` é do Jamie e não está
  marcado. A lane `knowledge` muda só a pasta de docs. O brief da sessão diz "publish
  nothing". O bilhete proposto B2 faz este trabalho.
- O comentário no JAM-475 não foi escrito. As regras do repositório proíbem escrever no
  Linear. O texto do comentário está em `findings.md`. O operador ou o BAXTER publica-o.

- O check Vercel do #272 está RED. O deploy falhou em 0 ms, antes do build. Causa provável: o
  projeto Neon `uat-agorasim` tem 10 branches (main, 7 previews das sessões paralelas, o
  preview do release e `local-test/2026-11-19`), e a integração não criou
  `preview/claude/jam-475-spike-blog-e821e1`. A mudança é só docs. Ato do operador: apagar um
  branch que já não serve (por exemplo `local-test/2026-11-19`) ou esperar que outro pull
  request feche, e depois fazer redeploy do preview. `code`, `icm-check`, `secrets` e
  `workflows` estão verdes. `icm-gate` espera o Ready to merge.

## Do not touch

- O portão de `research.md`: só o Jamie o marca.
