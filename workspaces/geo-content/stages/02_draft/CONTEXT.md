# Stage 02 — Draft

Write each article of the run as one file in the blog markdown format. The format is the
contract of `web/src/lib/blog-markdown.ts`. `web/src/content/generated/blog/README.md` shows a
full example.

## Inputs
- Layer 4 (working): `../01_research/output/research.md`. Its gate must be ticked. If the gate
  is not ticked, stop.
- Layer 4 (working): `../../setup/questionnaire.md`, for the slugs, the length and the
  constraints of the run.
- Layer 3 (reference): `../../../_config/voice.md`
- Layer 3 (reference): `../../../_config/business-facts.md`
- Layer 3 (reference): `../../../shared/geo-checklist.md`, the column "Blog article".

## Process
Write one file for each article of the run, in Agorasim's voice, in **both PT and EN**. PT and
EN are parallel native versions.

### The front matter
One `key: value` on one line for each field. A value does not wrap.

| Field | Rule |
|---|---|
| `slug` | The slug of the questionnaire. It is also the file name. |
| `date` | The day of the draft, `YYYY-MM-DD`. The site shows it as `dateModified`. |
| `tags` | Two to four places or themes, with commas between them. The same tags serve PT and EN. |
| `image` | A file that exists in `web/public/images/`, written as `/images/<folder>/<file>`. |
| `imageAlt.pt`, `imageAlt.en` | What the photograph shows, not the subject of the article. |
| `title.pt`, `title.en` | One line each. |
| `excerpt.pt`, `excerpt.en` | One line each. It is the card text and the meta description: it answers the target query. |

### The body
The body has two sections: `## pt` and `## en`. These two lines are the only headings in the
file.

- The first paragraph of each section is the primary answer of the research brief: 40 to 80
  words that answer the target query completely.
- Each paragraph is plain text. A blank line separates two paragraphs. One idea for each
  paragraph.
- Write no heading, no list, no bold, no italics, no blockquote and no backtick. The loader
  refuses a file that has one. The site shows each paragraph as typed.
  - A paragraph does not start with `#`, `-`, `*`, `+`, `>` or a number and a full stop (`1.`).
  - A paragraph has no `**`, no `__`, no `` ` `` and no `*word*`. Write Saloia, not `*Saloia*`.
- The article has no FAQ block. Answer three to five of the brief's questions in the prose:
  one short paragraph that is the question, then one paragraph of 1 to 3 sentences that is
  the answer. Put these pairs at the end of the section.
- The body has no links: the site shows a markdown link as typed. Name a page in words
  ("a página de reservas").
- The length of each section is the length that the questionnaire gives.

### The facts
Each fact comes from `business-facts.md`. If the brief and `business-facts.md` disagree, stop
and tell the operator. Do not write a price, an hour, a date or a claim that is not there.

## Outputs
- `output/<slug>.md`, one file for each article, in the blog markdown format.

A person reads each file before stage 03 runs.
