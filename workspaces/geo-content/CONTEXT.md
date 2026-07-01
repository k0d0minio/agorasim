# geo-content — Layer 1 (workspace routing)

Pipeline: **target query → research → draft → publish-ready block**.

## Stages
1. `stages/01_research/` — turn the target query into a research brief: what people ask, angles,
   supporting facts (from `_config/business-facts.md`), and the primary answer.
2. `stages/02_draft/` — write the content block (PT & EN): answer-first intro + sections + FAQ,
   in Agorasim's voice.
3. `stages/03_publish/` — validate against `shared/geo-checklist.md` and emit a structured file into
   `../../web/src/content/generated/`.

## Setup
Fill `setup/questionnaire.md` before stage 1 (the target query, the page it belongs to, any angle).

## Handoffs
Each stage reads the previous stage's `output/` and writes to its own `output/`. Review between stages.
