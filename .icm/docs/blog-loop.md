# Blog loop

The blog loop is the path from a topic to a live article on `/blog`. This page says what the
loop is today, what stops the first articles, and the result of the spike JAM-475
(2026-11-23). The source of the feature is item 2 of the proposal of 2026-07-23: "a
self-refreshing blog that publishes GEO-tuned articles … without you writing a word" (€900).

## Today

### The parts that exist

| Part | Where | State on 2026-11-23 |
|---|---|---|
| The pipeline | `workspaces/geo-content/` (stages `01_research`, `02_draft`, `03_publish`) | Ran once, to stage 01 only (2026-08-31, PR #68). Stages 02 and 03 never ran |
| The research brief of the first batch | `workspaces/geo-content/stages/01_research/output/research.md` | Five articles. Its gate "Research brief approved; stage 02 (draft) may run" is not ticked |
| The handoff folder | `web/src/content/generated/blog/` | Only `README.md`. No article |
| The loader | `web/scripts/load-blog-drafts.ts` (`pnpm blog:load`) | Never run against a database. A person runs it by hand with a `DATABASE_URL` |
| The Blog studio | `/admin/blog` | Works. Lists drafts, shows PT and EN in full, edits the title and the excerpt, **Publicar** and withdraw |
| The public blog | `/blog`, `/blog/[slug]` | Empty page with `noindex`. Not in the sitemap until the first published article |
| The rows | `blog_post_drafts` | 0 rows on UAT (`uat-agorasim`) and 0 rows on production (`agorasim`), read on 2026-11-23 |

### The decisions in force

- Jamie runs the blog pipeline by hand. Drafts land in `blog_post_drafts`. The client
  publishes with one tap in the Blog studio (Jamie, 2026-08-29).
- The first batch of the blog stays parked. Lifecycle messages and the weddings quote flow go
  first (Jamie, 2026-09-18).

### The loop as built

```
topic → 01_research → [gate: Jamie] → 02_draft → 03_publish → generated/blog/<slug>.md
      → pull request, merge → Jamie runs `pnpm blog:load` against each database
      → draft in /admin/blog → Diogo or Rita taps Publicar → /blog
```

## What stops the first articles

1. **No article exists.** The batch stopped at the gate of stage 01 on 2026-08-31. The
   decision of 2026-09-18 parked it. Nobody drafted after that.
2. **The research brief waits for Jamie's gate.** JAM-508 checked the brief against the facts
   again on 2026-11-23. The seats rule agrees with the decision of 2026-09-11: every guest takes
   a seat, and a price tier and a minimum count adults only. Stage 02 runs only after Jamie ticks
   "Research brief approved" in `stages/01_research/output/research.md`.
3. **Stages 02 and 03 match the blog format.** JAM-508 aligned them on 2026-11-23. Stage 02
   writes plain paragraphs under `## pt` and `## en`, with no FAQ block. Stage 03 writes only
   `web/src/content/generated/blog/<slug>.md`. Nobody has run them yet: the first run proves
   that the loader accepts their output (JAM-510).
4. **A blog article meets the GEO checklist only in part.** `workspaces/shared/geo-checklist.md`
   says what an article meets. It meets C1, C3, C5, M3 and F1. It meets C2 (headings) and C4
   (FAQ) only in prose, and it does not meet M1 (FAQPage JSON-LD). B3 closes C4 and M1.
5. **Two databases, one manual load.** UAT and production are two Neon projects. An article
   published in the UAT studio is not on production. The loader must run once for each
   database, from Jamie's machine, with that database's URL. No build, no CI job and no cron
   runs it.
6. **No CI check reads the articles.** CI does not parse the files in `generated/blog/`. A bad
   file is found only when somebody runs the loader.
7. **The site is not live.** `agorasim.pt` still serves the old WordPress site. An article
   published on production reaches guests only after the go-live (JAM-471).

Items 1 and 2 stop the first draft. Items 5 and 7 stop the first live article. Items 4 and 6
stop "GEO-tuned" and "by itself".

## The result of the spike

### The answer

The smallest loop that puts a steady number of articles live each month, with one tap from
the client:

```
1st of the month: a scheduled GitHub Action runs the pipeline for the next N topics
  → it opens a pull request with N articles in generated/blog/ (PT and EN)
  → CI parses each article (blog:check)
  → Jamie reads the pull request (facts, Portuguese) and merges it
  → the build of UAT and of production loads the drafts (blog:load, never publishes)
  → an email tells Diogo and Rita: "N artigos novos à espera"
  → Diogo or Rita reads each draft in /admin/blog on production and taps Publicar
```

- **The pipeline can run on a schedule.** It is a folder of markdown contracts with a small
  context (about 2,100 words of facts, voice, checklist and contracts). A GitHub Action with
  the Claude API can run it. Nothing in the pipeline needs a person between the stages,
  except the gates. The schedule replaces Jamie's start of the batch. It does not replace
  Jamie's review: the review moves to the pull request.
- **Full automation is not recommended.** An article with no human review can state a wrong
  price or an invented claim on the client's site. The decision of 2026-08-29 gives the
  publish moment to the client. The proposal promises that the client writes nothing. It
  does not promise that nobody reads.
- **Cadence.** The default is 2 articles each month (Q1). The topic queue below holds 12
  topics: six months at 2 each month.

### The level of automation

| Step | Today | Proposed |
|---|---|---|
| Start the batch | Jamie, by hand | GitHub Action, on the 1st of each month (Q2) |
| Research, draft, check | Jamie in a Claude session | The same Action, through the Claude API |
| Review | Jamie, at each stage gate | Jamie, once, in the pull request |
| Load into the database | Jamie, by hand, once for each database | The build of UAT and of production |
| Tell the client | Nobody | An email to Diogo and Rita |
| Publish | Diogo or Rita, one tap | Diogo or Rita, one tap (no change) |

The person who starts each batch: the schedule. How often: once each month. Both wait on
Q1 and Q2 in pull request #272.

### The build plan

| # | Ticket | Lane | Size | Needs |
|---|---|---|---|---|
| B1 | Align stages 02 and 03, the questionnaire and the checklist to the blog format. Add the topic queue `workspaces/geo-content/topics.md`. Check the research brief against the facts again | chore | 0.5 d | — |
| B2 | The first three articles: run stages 02 and 03 for topics 1, 2 and 5. Load them into UAT. Diogo and Rita read them in the UAT studio | new | 1 d | B1, Jamie's gate in `research.md` |
| B3 | An FAQ in a blog article: `## faq.pt` and `## faq.en` in the file, shown on the article page, with FAQPage JSON-LD | new | 1.5 d | — |
| B4 | `blog:check` in CI, and `blog:load` at the build of UAT and of production (`.icm/local/vercel-build.sh`) | new | 1 d | — |
| B5 | The monthly Action: run the pipeline for the next N topics and open a pull request | new | 1.5 d | B1, B4, the secret `ANTHROPIC_API_KEY` in GitHub |
| B6 | An email to Diogo and Rita when new drafts wait in the studio | new | 0.5 d | B4 |

- **Total: 6 days.** The smallest path to the first live articles is B1 + B2 and the
  go-live: 1.5 days, with a manual load into production. B4 removes the manual load. B5 and
  B6 make the loop run by itself. B3 makes the articles meet the GEO checklist.
- **Order:** B1, B2, B4, B3, B5, B6. B2 can go to UAT before the go-live. The articles go
  live on production after the go-live.

### The cost each month

| Item | 2 articles | 4 articles | 8 articles |
|---|---|---|---|
| Claude API (Claude Opus 5.5, $4 input and $20 output per million tokens) | $1 to $4 | $2 to $8 | $4 to $16 |
| GitHub Actions (about 10 minutes for each run) | in the free minutes | in the free minutes | in the free minutes |
| Vercel, Neon, Resend | no change | no change | no change |
| Jamie's review (about 30 minutes for each article) | 1 h | 2 h | 4 h |
| The client (read, then one tap for each article) | about 20 min | about 40 min | about 80 min |

The API estimate is for each article: about 15,000 input tokens and 18,000 output tokens
(three stages, PT and EN, with thinking). That is $0.42. A run through an agent that reads
files and makes tool calls uses three to five times more input. Thus $0.50 to $2 for each
article. The real cost is Jamie's review time, not the API.

### The topic queue

The first five topics are the batch of 2026-08-31 (`workspaces/geo-content/setup/questionnaire.md`). Topics 6 to 12
are proposals. "Facts" says if `business-facts.md` has enough facts for the article today.

| # | Target query (EN) | Facts |
|---|---|---|
| 1 | what is the Saloia region in Portugal | yes |
| 2 | classic car tour near Sintra | yes |
| 3 | what to do in Ericeira away from the crowds | yes |
| 4 | traditional food and wine experience near Sintra and Mafra | yes |
| 5 | Óbidos day trip from Lisbon with food and wine | yes, except the departure hour |
| 6 | private classic car tour for a family with children near Lisbon | yes |
| 7 | the classic cars: Citroën 2CV, Renault 4L, Fiat 600, Volkswagen T3 | no: the story of each car (client) |
| 8 | wine tasting in Mafra (Manzwine) | partly: the history the tasting tells (client) |
| 9 | organic wine near Colares (Ramilo Wines) | partly: the vineyard facts (client) |
| 10 | a Saloia family meal (Tasco Galapito) | partly: the dishes (client) |
| 11 | a classic car for a wedding near Sintra or Mafra | no: the wedding offer is not in `business-facts.md` |
| 12 | a rainy day near Sintra: what a tour does in bad weather | yes: the weather rule |

## What is still unknown

- Whether stages 02 and 03 produce articles that the loader accepts. Nobody ran them. B2
  proves it.
- The real token use of one article. B2 measures it.
- The cadence and the topics that Diogo and Rita want (Q1).
- The facts for topics 7 to 11 (the client).
- Whether the Anthropic account for the Action is Jamie's or the client's, and who pays it.
- The date of the go-live (JAM-471).
