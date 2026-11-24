# Handoff jam-510

## Next action

O operador abre `/admin/blog` no UAT, lê os três rascunhos em PT e em EN e marca **Ready to
merge** no pull request #285. Depois diz `release JAM-510`. O Diogo e a Rita publicam eles
próprios. Este run não publica nada.

## Done

- As afirmações fora de `business-facts.md` saíram do brief (Q1). A nota "Cut on 2026-11-24"
  no artigo 1 de `research.md` lista-as.
- Tópico 1 (`o-que-e-a-regiao-saloia`), escrito depois do merge do JAM-558: diz que a Ericeira
  é a primeira Reserva Mundial de Surf da Europa (Save The Waves Coalition, 2011), sem UNESCO.
- Tópico 2 (`passeio-de-carro-classico-perto-de-sintra`) e tópico 5
  (`obidos-a-partir-de-lisboa`): etapas 02 e 03 feitas. Os ficheiros estão em
  `workspaces/geo-content/stages/02_draft/output/`, `03_publish/output/` e
  `web/src/content/generated/blog/`. Os três exemplares de cada ficheiro são iguais.

## Tokens (Q3)

Um subagente escreveu um artigo, etapas 02 e 03. O harness dá o total do contexto do subagente.
Entre parênteses: os tokens de saída e as leituras de cache somadas de todas as chamadas.

| Tópico | Total do harness | Saída | Leituras de cache | Escrita de cache | Chamadas de ferramentas |
|---|---|---|---|---|---|
| 2 | 99 371 | 11 355 | 820 194 | 98 719 | 11 |
| 5 | 111 387 | 23 610 | 1 071 254 | 110 693 | 15 |
| 1 | 103 756 | 13 324 | 649 318 | 103 091 | 11 |

## What the subagents left out (not in business-facts.md)

- Tópico 2: "a local host drives" (o texto diz "um motorista da Agorasim"), "the palace queues"
  (o texto diz "longe das multidões"), e o facto da Ericeira.
- Tópico 1: "north-west of Lisbon", "the palaces are not what this region is for", "the tours
  avoid the usual routes", "still working the land", e uma melhor época do ano. A pergunta da
  época passou a "Quando posso ir?", com as partidas e o prazo de reserva. A Ericeira é "uma
  Reserva Mundial de Surf da Save The Waves Coalition desde 2011, a primeira da Europa".
- Tópico 5: "walled town", "central Lisbon", "small scale", o que é a paragem de comida, e a
  regra dos lugares desta rota. Não dá hora de partida: a hora chega por email ou WhatsApp.

## The load into UAT (Q2)

- 2026-11-24, depois do CI verde no commit do artigo 1. Primeiro `--dry-run`: 3 ficheiros
  aceites, 3 novos, 0 recusados. Depois a carga: "3 new, 0 updated, 0 unchanged, 0 skipped".
- Um script do scratchpad leu a connection string na API do Neon e deu-a só ao ambiente do
  processo do loader. O script recusa um projeto que não seja `uat-agorasim`. A string não foi
  escrita nem mostrada.
- Lido no UAT depois da carga: `blog_post_drafts` tem 3 linhas, cada uma `status = draft` e
  `published_at` vazio.
- Produção: o run não ligou à base de produção. A leitura de verificação foi recusada pelas
  permissões da sessão, por isso o critério "nenhum artigo publicado em produção" está provado
  só pelo desenho do script, não por uma leitura.

## Acceptance criteria

- Critério 1, três ficheiros aceites: cumprido (`--dry-run` e carga sem erro).
- Critério 2, três rascunhos em `/admin/blog`: para o operador. A tabela tem as 3 linhas.
- Critério 3, nada publicado: cumprido no UAT. Produção: ver acima.
- Critério 4, cada rascunho por inteiro: para o operador.
- Critério 5, nenhum facto fora de `business-facts.md` e sem UNESCO: cumprido pela leitura dos
  três ficheiros. Nenhum diz "UNESCO".
- Critério 6, tokens: a tabela acima, e um comentário no pull request.
- Critério 7, CI: verde.

## How to test

Entre em `/admin/blog` no UAT. Vê três rascunhos: a região saloia, o passeio perto de Sintra e
Óbidos a partir de Lisboa. Abra cada um em PT e em EN e leia-o até ao fim.

## Blockers

- O operador marca Ready to merge.

## Do not touch

- O estado de publicação de qualquer artigo.
- A base de dados de produção.
