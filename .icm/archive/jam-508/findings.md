# Findings jam-508

The operator files these later. One entry for each finding.

## O parágrafo do domínio em business-facts.md (JAM-526)

- where: `workspaces/_config/business-facts.md`, secção Company, linha "Domain"
- what: A verificação deste run não tocou neste parágrafo. O brief não cita o domínio nem diz que o site está no ar. O parágrafo fica como estava, para o JAM-526.
- proposed: nada de novo. O JAM-526 já existe

## "UNESCO World Surfing Reserve" pode estar errado

- where: `workspaces/_config/business-facts.md` (Experiences), `web/src/content/experiences.ts`, e os artigos 1 e 3 de `workspaces/geo-content/stages/01_research/output/research.md`
- what: As World Surfing Reserves são um programa da Save The Waves Coalition, não da UNESCO. Os três ficheiros dizem "UNESCO". O artigo 3 diz também "the only … in Europe", que não está em `business-facts.md`. Não foi verificado numa fonte neste run. O artigo 1 (um dos três do JAM-510) cita este facto.
- proposed: bug. Verificar e corrigir antes de um artigo com este facto chegar ao cliente

## O brief tem afirmações que não estão em business-facts.md

- where: `workspaces/geo-content/stages/01_research/output/research.md`, artigos 1 e 4
- what: O artigo 1 diz que os saloios abasteciam Lisboa de legumes, pão e vinho, e que a região fica a meia hora da costa e da capital. O artigo 4 diz que a Ramilo Wines fica nas encostas de Colares viradas ao Atlântico. `business-facts.md` não tem estes factos. O ticket pediu a verificação de cinco factos, e estes não fazem parte deles.
- proposed: question for the ticket JAM-510. O Jamie decide ao aprovar o brief: juntar os factos a `business-facts.md` (com a confirmação do cliente) ou cortá-los do brief

## A página blog-loop.md fica desatualizada depois deste merge

- where: `.icm/docs/blog-loop.md`, secção "What stops the first articles", pontos 2, 3 e 4
- what: Os pontos 2 e 3 deixam de ser verdade com este merge. O ponto 2 diz também que "everyone counts for seats" contradiz a decisão de 2026-09-11. Não contradiz: os lugares contam todos, e o escalão de preço e o mínimo contam só adultos. O ponto 4 fica verdade em parte: a checklist diz agora o que um artigo cumpre.
- proposed: knowledge

## O README de generated/ fala de blocos JSON que não existem

- where: `web/src/content/generated/README.md`
- what: Diz que o site importa ficheiros `<slug>.json`. Não existe nenhum e nenhum código importa um. A fase 03 já não escreve esse bloco.
- proposed: chore

## O questionário e o brief apontam para um ficheiro apagado

- where: `workspaces/geo-content/setup/questionnaire.md` e `research.md`, linha "Run"
- what: Citam `.icm/intake/blog-engine/blog-pipeline-first-batch.md`. A árvore foi limpa em 2026-09-11 e o ficheiro não existe.
- proposed: chore
