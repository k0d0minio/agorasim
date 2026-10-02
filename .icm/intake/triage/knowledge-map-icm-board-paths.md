# Stub: Make the knowledge map validate — the icm-board documents are routed as local pages

- lane: chore
- found-by: reservar-embedded-checkout release review · 2026-10-02
- complexity: low

## Problem

`.icm/scripts/validate-knowledge-map.sh` reads `RESULT: INVALID` on `main`, independent of any
run: `.icm/_shared/knowledge-map.md` names the client's three PDFs (the proposal, the
process guide, the commission agreement) by their icm-board path
(`workspaces/deals/agorasim/agorasim-v1/raw/documents/…`), and the validator resolves every
slashed backticked path under `.icm/docs/`, where they do not exist. A Release's docs sync and
the knowledge lane both end on this validator, so a real stale slice is hidden behind a
permanent red.

## Proposed change

Name the three icm-board documents in prose rather than as checked paths — the same treatment
the map already gives `workspaces/_config/business-facts.md` — so the validator checks only
the pages this repo holds. No page moves; the map's routing does not change.

## Prompt

In the agorasim repo, read `.icm/intake/triage/knowledge-map-icm-board-paths.md`. Edit
`.icm/_shared/knowledge-map.md` (project-owned) so the icm-board PDFs are named in prose, run
`.icm/scripts/validate-knowledge-map.sh` → `RESULT: OK`, and `git mv` the stub to `_done/` in
the PR, on a `claude/` branch.
