# Stage 03 — Publish

## Inputs
- Layer 4 (working): `../02_draft/output/draft.md`
- Layer 3 (reference): `../../../shared/geo-checklist.md`

## Process
1. Check the draft against every item in `geo-checklist.md`. Fix any misses.
2. Convert to a structured, typed block the site can render: a JSON object with
   `{ slug, targetPage, dateModified, pt: { intro, sections[], faqs[] }, en: { … } }`.
   Mirror the `Localized` shape used in `web/src/content/` so the FAQ maps to FAQPage JSON-LD.

## Outputs
- `output/<slug>.json`
- Copy of the final file into `../../../../web/src/content/generated/<slug>.json`
  (this is the Layer 4 handoff to the website).
