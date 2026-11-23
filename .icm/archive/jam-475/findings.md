# Findings jam-475

The operator files these later. One entry for each finding.

## Comentário para o JAM-475 (rascunho)

- where: Linear JAM-475
- what: o texto abaixo é o comentário de resumo. O BAXTER publicou-o no JAM-475 em
  2026-11-23.
- proposed: question for the ticket

> Spike result: `.icm/docs/blog-loop.md` in PR #272.
> Blocked today: no article exists (the batch stopped at Jamie's stage-01 gate on 2026-08-31,
> then parked on 2026-09-18); the research brief predates three fact changes; stages 02 and 03
> still describe the JSON block, not the blog markdown; a blog article has no FAQ, so it fails
> the GEO checklist; the loader is a manual script, once for each of the two databases; the
> site is not live (JAM-471). 0 rows in `blog_post_drafts` on UAT and on production.
> Proposed loop: a monthly GitHub Action drafts N articles into a PR, Jamie reviews and
> merges, the build loads the drafts, an email tells Diogo and Rita, they tap Publicar.
> Full automation without review: not recommended.
> Build plan: B1 align the pipeline (chore, 0.5 d), B2 first three articles on UAT (1 d),
> B3 FAQ in articles (1.5 d), B4 blog:check in CI and load at build (1 d), B5 monthly Action
> (1.5 d), B6 email to the client (0.5 d). Total 6 d. Cost: $1 to $4 a month of API at 2
> articles, plus about 1 h of Jamie's review.
> Not done: three drafts in the UAT studio (needs Jamie's gate; ticket B2).
> Questions: Q1 cadence (client, default 2), Q2 who starts each batch (default the schedule).

## O parágrafo do domínio em business-facts.md está desatualizado

- where: `workspaces/_config/business-facts.md`, secção Company
- what: diz que o site fica online no dia em que a transferência do registo termina
  (2026-09-11). Em 2026-11-23 `agorasim.pt` ainda serve o WordPress antigo. Um artigo
  escrito deste ficheiro pode repetir uma data falsa.
- proposed: chore (com o JAM-471). Criado: JAM-526.

## A lane knowledge e um spike com plano

- where: `.icm/_system/lanes/knowledge/CONTEXT.md`, ponto 2
- what: a lane diz "Write no plan". O bilhete de spike pede um plano de construção na
  página. A página segue o bilhete e marca o plano como proposta. É uma falha do blueprint
  para o operador.
- proposed: question for the ticket

## Os bilhetes de construção criados

- where: Linear, equipa JAM, projeto agorasim, estado Triage
- what: o Jamie decidiu em 2026-11-23 que as sessões escrevem no Linear com a ferramenta
  BAXTER. Esta decisão substitui, para esta sessão, a regra "esta sessão não escreve no
  Linear". O Jamie disse "Yes, create them" nesta sessão (2026-11-23). O Jamie decidiu em
  2026-11-23 que o blogue vem depois do go-live (JAM-471). Cada bilhete diz isso.
- proposed: nada. Os bilhetes existem:

| Plano | Chave | Lane | Estimativa | Relações |
|---|---|---|---|---|
| B1 | JAM-508 | chore | 1 | related JAM-475, blocks JAM-510 e JAM-521 |
| B2 | JAM-510 | new | 2 | related JAM-475 |
| B3 | JAM-514 | new | 3 | related JAM-475 |
| B4 | JAM-517 | new | 2 | related JAM-475, blocks JAM-521 e JAM-524 |
| B5 | JAM-521 | new | 3 | related JAM-475 |
| B6 | JAM-524 | new | 1 | related JAM-475 |
| O parágrafo do domínio | JAM-526 | chore | 1 | related JAM-475 e JAM-471 |
