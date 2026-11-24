# Spec: agorasim · The first three blog articles wait in the Blog studio on UAT

- ticket: JAM-510
- touches: workspaces/geo-content/stages/01_research/output/research.md, workspaces/geo-content/stages/02_draft/output/, workspaces/geo-content/stages/03_publish/output/, workspaces/geo-content/topics.md, web/src/content/generated/blog/o-que-e-a-regiao-saloia.md, web/src/content/generated/blog/passeio-de-carro-classico-perto-de-sintra.md, web/src/content/generated/blog/obidos-a-partir-de-lisboa.md
- complexity: standard

## Problem

O blog não tem nenhum artigo. `blog_post_drafts` tem 0 linhas no UAT e em produção (lido em
2026-11-23). A pipeline parou na gate da etapa 01 em 2026-08-31. Ninguém sabe se as etapas 02 e
03 fazem um artigo que o loader aceita, nem quantos tokens um artigo usa.

## Proposed change

O Diogo e a Rita abrem `/admin/blog` no UAT e veem três rascunhos, cada um em PT e em EN. Leem
cada rascunho por inteiro e publicam eles próprios quando quiserem. Nenhum artigo é publicado
por este run.

1. **Os três tópicos.** Os tópicos 1, 2 e 5 da fila (`workspaces/geo-content/topics.md`):
   `o-que-e-a-regiao-saloia`, `passeio-de-carro-classico-perto-de-sintra` e
   `obidos-a-partir-de-lisboa`.
2. **As etapas.** O Build corre as etapas 02 (rascunho) e 03 (publicação para ficheiro) de
   `workspaces/geo-content/` para cada tópico, e põe os três ficheiros em
   `web/src/content/generated/blog/`. A fila muda o estado de cada tópico para
   `handoff <data>`.
3. **A carga.** `pnpm blog:load` põe os três ficheiros em `blog_post_drafts` no UAT, como
   `draft` (Q2). O loader nunca publica.
4. **Os tokens.** O pull request diz o número de tokens de cada artigo (Q3).

Decisões desta spec (o default de cada pergunta do pull request):

- **Assistido, não gerido (decisão do Jamie, 2026-11-24).** "it's going to be AI assisted but no
  fully managed, diogo and rita still need to be able to publish themselves". Os artigos ficam
  rascunhos. O run não publica e não constrói publicação automática.
- **Afirmações fora dos factos (Q1).** O Build corta do brief as afirmações que não estão em
  `business-facts.md`, antes da etapa 02.
- **O facto UNESCO.** O artigo 1 cita a Ericeira como "UNESCO World Surfing Reserve". As World
  Surfing Reserves são um programa da Save The Waves Coalition. O lote de correções corrige o
  facto em `business-facts.md` e no brief. O artigo 1 só é escrito depois dessa correção estar
  em `main`.
- **Uma gate no brief.** A linha "Research brief approved" de `research.md` é do Jamie. O Build
  não corre a etapa 02 enquanto a caixa não estiver marcada.
- **Tempo.** O ticket diz "depois do go-live". O Jamie levantou esta linha em 2026-11-23
  ("yes"). Os rascunhos vão para o UAT antes do go-live. A produção fica fora deste run.

## Acceptance criteria

- [ ] Três ficheiros em `web/src/content/generated/blog/`, um por tópico, cada um com PT e EN, e `pnpm blog:load --dry-run` aceita os três sem erro. (verify: agent)
- [ ] Os três rascunhos, cada um em PT e em EN, aparecem em `/admin/blog` no UAT com o estado rascunho. (verify: operator)
- [ ] Nenhum artigo está publicado no UAT nem em produção. (verify: agent)
- [ ] Cada rascunho abre por inteiro no estúdio do blog do UAT, nas duas línguas. (verify: operator)
- [ ] Nenhum facto de um artigo falta em `business-facts.md`, e nenhum artigo diz "UNESCO" sobre a Ericeira. (verify: agent)
- [ ] O pull request diz o número de tokens de cada artigo. (verify: agent)
- [ ] Os checks de CI passam. (verify: CI)

## Out of scope

- Publicar um artigo, no UAT ou em produção. O Diogo e a Rita publicam em `/admin/blog`.
- Publicação automática, a Action mensal (B5), o email de novos rascunhos (B6).
- `blog:check` no CI e `blog:load` no build (B4). O FAQ (B3).
- Os tópicos 3, 4 e 6 a 12.
- A base de dados de produção e o go-live (JAM-471).
- A correção do facto UNESCO. É do lote de correções.
- O contacto com o cliente.

## Open questions

- none
