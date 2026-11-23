# Stage 03 — Publish

Check each drafted article and put it in the handoff folder of the blog. The pipeline ends
there. This stage does not load a database and it does not publish.

## Inputs
- Layer 4 (working): `../02_draft/output/<slug>.md`, one file for each article.
- Layer 4 (working): `../../topics.md`
- Layer 3 (reference): `../../../shared/geo-checklist.md`, the column "Blog article".
- Layer 3 (reference): `../../../_config/business-facts.md`
- The format: `../../../../web/src/lib/blog-markdown.ts` and
  `../../../../web/src/content/generated/blog/README.md`.

## Process
1. Check each article against each item of `geo-checklist.md` that applies to a blog article.
   Correct each miss.
2. Check each fact of the article against `business-facts.md`. Correct each difference.
3. Check the file against the blog markdown format. The loader refuses a file that fails one
   of these rules:
   - The file starts with a front matter block between two `---` lines.
   - Each front matter field is `key: value` on one line. No field is there twice.
   - `title.pt`, `title.en`, `excerpt.pt` and `excerpt.en` are there.
   - `slug` is lower-case words with hyphens between them, and it is the file name.
   - `date` is a real day, written `YYYY-MM-DD`.
   - `image` starts with `/images/` and the file exists in `web/public/images/`. With an
     image, `imageAlt.pt` and `imageAlt.en` are there.
   - The body has one `## pt` section and one `## en` section, and no text before the first.
     Each section has one paragraph or more.
   - The body has no heading, no list, no bold, no italics, no blockquote, no code fence and
     no backtick.
4. Copy each file that passes to the handoff folder. Do not change the file name.
5. In `topics.md`, set the State of each topic that you copied to `handoff`, with the date.

### Why a blog article and not a JSON block
The target page of this pipeline is the blog (`blog/<slug>`). The blog reads only the markdown
files of the handoff folder. No page of the site reads a `generated/<slug>.json` block, so
this stage does not write one.

### After this stage
The pull request of the run carries the files. After the merge, Jamie runs `pnpm blog:load`
against each database. The articles are then drafts in the Blog studio (`/admin/blog`). Diogo
or Rita publishes each one with **Publicar** (Jamie, 2026-08-29).

## Outputs
- `output/<slug>.md`, the checked file of each article.
- A copy of each file in `../../../../web/src/content/generated/blog/<slug>.md`. This is the
  Layer 4 handoff to the website.
- `../../topics.md`, with the new State of each topic.
