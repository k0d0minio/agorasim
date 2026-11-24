# Setup questionnaire

Answer these before running the pipeline. Kept as a file so the whole run is self-documenting.

> **Run:** first blog batch · 2026-08-31. Its stub was removed in the clean-up of 2026-09-11.
> The topics are now in `../topics.md`.
>
> This run is a **batch of five articles**, so each question is answered once for the batch
> and then per article. `research.md` holds one section per article. Stages 02 and 03 write
> one file per article, `<slug>.md`, in the blog markdown format.
>
> The topics of a run come from the topic queue, `../topics.md`. This run took topics 1 to 5.
> The brief was checked against the facts again on 2026-11-23 (JAM-508).

- **Target query** (the exact question/phrase to win in AI search):
  One per article — five queries, chosen to cover the region, both tours and all three partners
  without overlapping each other:

  | # | Slug | Target query (EN) | Target query (PT) |
  |---|---|---|---|
  | 1 | `o-que-e-a-regiao-saloia` | what is the Saloia region in Portugal | o que é a região saloia |
  | 2 | `passeio-de-carro-classico-perto-de-sintra` | classic car tour near Sintra | passeio de carro clássico perto de Sintra |
  | 3 | `ericeira-longe-das-multidoes` | what to do in Ericeira away from the crowds | o que fazer na Ericeira fora das multidões |
  | 4 | `sabores-saloios-a-mesa` | traditional food and wine experience near Sintra and Mafra | comer e provar vinhos na região saloia |
  | 5 | `obidos-a-partir-de-lisboa` | Óbidos day trip from Lisbon with food and wine | visitar Óbidos a partir de Lisboa |

- **Target page** (where this block will live on the site):
  `blog/<slug>` — the public blog, both locales. The pipeline has one handoff, the **blog
  handoff**: `web/src/content/generated/blog/<slug>.md`, loaded with `pnpm blog:load`. Stage 03
  (`../stages/03_publish/CONTEXT.md`) says why it writes no `generated/<slug>.json` block.

- **Locale scope**: PT + EN. PT is primary; EN is a parallel native version, not a translation.

- **Angle** (optional — what to emphasise this run):
  First batch, so it establishes the ground: what the region *is*, what the two tours *are*,
  and who the partners are. Answer-first and concrete throughout — real prices, real durations,
  real meeting points — because a first batch is what an AI search engine will learn the
  business from.

- **Must-include facts** (optional, beyond `_config/business-facts.md`):
  None beyond it. `business-facts.md` was re-verified against `.icm/docs/prices.pdf` and
  `web/src/content/experiences.ts` on 2026-08-31 before drafting, and now carries the real
  price list, meeting points and cancellation terms. Olaria MZ is retired and appears nowhere.
  The check of 2026-11-23 added the tours that each add-on joins and the seat rule. The brief
  (`../stages/01_research/output/research.md`) lists what changed.

- **Constraints** (optional): length, sections, anything to avoid:
  - **The blog body is plain paragraphs.** `lib/blog-markdown.ts` refuses headings, lists,
    bold, italics, blockquotes and backticks, because the renderer emits `<p>` and they would
    reach readers verbatim. So an article has no H2/H3 hierarchy and no FAQ block. Stage 02
    (`../stages/02_draft/CONTEXT.md`) has the rules of the body, and
    `../../shared/geo-checklist.md` says which GEO items a blog article meets.
  - 450–700 words per locale per article. Every article opens with 1–3 sentences that answer
    its target query outright.
  - No invented prices, dates, awards or claims. No Olaria MZ. No "amazing"/"unforgettable".
  - Hero images must be files that exist in `web/public/images/`, with alt text that describes
    the frame honestly — not the article's subject.
