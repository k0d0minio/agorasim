# Handoff jam-510

## Next action

Depois do merge do JAM-558 (pull request #286, a correção do facto UNESCO), a sessão seguinte:

1. Junta `origin/main` a este ramo.
2. Corre as etapas 02 e 03 para o tópico 1 (`o-que-e-a-regiao-saloia`), com um subagente, e
   regista os tokens dele.
3. Muda o estado do tópico 1 em `workspaces/geo-content/topics.md`.
4. Faz push, lê o CI e carrega os três rascunhos no UAT com `pnpm blog:load` (Q2). A connection
   string do UAT fica só no ambiente do processo.

## Done

- As afirmações fora de `business-facts.md` saíram do brief (Q1). A nota "Cut on 2026-11-24"
  no artigo 1 de `research.md` lista-as.
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

## How to test

Ainda não há rascunhos no UAT. Depois da carga: abra `/admin/blog` no UAT e veja três
rascunhos. Abra cada um em PT e em EN e leia-o até ao fim.

## Blockers

- O artigo 1 espera o merge do JAM-558 (pull request #286): o brief cita o facto UNESCO.

## Do not touch

- O estado de publicação de qualquer artigo.
- A base de dados de produção.
