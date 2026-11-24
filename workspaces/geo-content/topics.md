# Topic queue

The topics of the blog, in the order in which the pipeline takes them. One topic becomes one
article. The source of the list is `.icm/docs/blog-loop.md` (JAM-475, 2026-11-23). Topics 1 to
5 are the batch of 2026-08-31. Topics 6 to 12 are proposals: the client has not seen them.

## The queue

| # | Target query (EN) | Target query (PT) | Slug | Facts | State |
|---|---|---|---|---|---|
| 1 | what is the Saloia region in Portugal | o que é a região saloia | `o-que-e-a-regiao-saloia` | yes | handoff 2026-11-24 |
| 2 | classic car tour near Sintra | passeio de carro clássico perto de Sintra | `passeio-de-carro-classico-perto-de-sintra` | yes | handoff 2026-11-24 |
| 3 | what to do in Ericeira away from the crowds | o que fazer na Ericeira fora das multidões | `ericeira-longe-das-multidoes` | yes | brief |
| 4 | traditional food and wine experience near Sintra and Mafra | comer e provar vinhos na região saloia | `sabores-saloios-a-mesa` | yes | brief |
| 5 | Óbidos day trip from Lisbon with food and wine | visitar Óbidos a partir de Lisboa | `obidos-a-partir-de-lisboa` | yes, except the departure hour | handoff 2026-11-24 |
| 6 | private classic car tour for a family with children near Lisbon | — | — | yes | queue |
| 7 | the classic cars: Citroën 2CV, Renault 4L, Fiat 600, Volkswagen T3 | — | — | no: the story of each car (client) | queue |
| 8 | wine tasting in Mafra (Manzwine) | — | — | partly: the history that the tasting tells (client) | queue |
| 9 | organic wine near Colares (Ramilo Wines) | — | — | partly: the vineyard facts (client) | queue |
| 10 | a Saloia family meal (Tasco Galapito) | — | — | partly: the dishes (client) | queue |
| 11 | a classic car for a wedding near Sintra or Mafra | — | — | no: the wedding offer is not in `business-facts.md` | queue |
| 12 | a rainy day near Sintra: what a tour does in bad weather | — | — | yes: the weather rule | queue |

## The columns

- **Facts** says if `../_config/business-facts.md` has enough facts for the article today
  (2026-11-23).
  - `yes`: the pipeline can write the article.
  - `partly` and `no`: the article needs facts that only the client has. The words after the
    colon name them. `(client)` means that Diogo or Rita must give them. Jamie asks. The
    pipeline does not invent them.
- **State** says how far the topic is.

  | State | Meaning |
  |---|---|
  | `queue` | No stage ran for the topic |
  | `brief` | The topic has a section in `stages/01_research/output/research.md` |
  | `handoff <date>` | Stage 03 put the article in `web/src/content/generated/blog/` on that date |

## The rules

1. A run takes the next topics in the order of the queue. It skips a topic whose Facts is
   `partly` or `no`. Jamie can give another order for a run.
2. The questionnaire of the run (`setup/questionnaire.md`) names the topics that the run takes.
   It gives a topic of 6 to 12 its PT target query and its slug. Write them in the queue then.
3. When `business-facts.md` gets the missing facts of a topic, change its Facts to `yes` in
   the same pull request.
4. Stage 01 sets State to `brief`. Stage 03 sets State to `handoff <date>`.
5. A new topic goes at the end of the queue, with its Facts.
6. A topic stays in the queue after its article is live. The row is the record that the topic
   is taken.
