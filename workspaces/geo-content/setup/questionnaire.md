# Setup questionnaire

Answer these before running the pipeline. Kept as a file so the whole run is self-documenting.

> **Run:** first blog batch (`.icm/intake/blog-engine/blog-pipeline-first-batch.md`) · 2026-08-31
>
> This run is a **batch of five articles**, not a single content block, so each question is
> answered once for the batch and then per article. The stage outputs keep the filenames the
> stage contracts declare (`research.md`, `draft.md`); each holds one section per article.

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
  `blog/<slug>` — the public blog, both locales. This batch takes the **blog handoff**
  (`web/src/content/generated/blog/<slug>.md`, loaded with `pnpm blog:load`), not the
  `generated/<slug>.json` block handoff. See stage 03 for why.

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

- **Constraints** (optional): length, sections, anything to avoid:
  - **The blog body is plain paragraphs.** `lib/blog-markdown.ts` refuses headings, lists,
    bold, blockquotes and backticks, because the renderer emits `<p>` and they would reach
    readers verbatim. So the H2/H3 hierarchy the GEO checklist asks for cannot live inside an
    article body — see the note at stage 03.
  - 450–700 words per locale per article. Every article opens with 1–3 sentences that answer
    its target query outright.
  - No invented prices, dates, awards or claims. No Olaria MZ. No "amazing"/"unforgettable".
  - Hero images must be files that exist in `web/public/images/`, with alt text that describes
    the frame honestly — not the article's subject.
