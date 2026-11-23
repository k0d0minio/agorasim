# geo-content — Layer 1 (workspace routing)

Pipeline: **topic → research → draft → blog article in the handoff folder**.

## Stages
1. `stages/01_research/` — turn the target query into a research brief: what people ask, angles,
   supporting facts (from `_config/business-facts.md`), and the primary answer.
2. `stages/02_draft/` — write each article (PT & EN) in the blog markdown format: front matter,
   then plain paragraphs, answer first, in Agorasim's voice.
3. `stages/03_publish/` — check each article against `shared/geo-checklist.md`, the facts and the
   format, and copy it to `../../web/src/content/generated/blog/<slug>.md`.

## Topics
`topics.md` is the topic queue: the target queries in order, and if `business-facts.md` has the
facts for each one. A run takes its topics from the queue.

## Setup
Fill `setup/questionnaire.md` before stage 1 (the topics of the run, their slugs, any angle).

## Handoffs
Each stage reads the previous stage's `output/` and writes to its own `output/`. Review between stages.
