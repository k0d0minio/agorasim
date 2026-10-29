# Stub: No file names the retired `.icm/project.json`

- lane: chore
- found-by: Jamie · 2026-10-29
- complexity: low
- priority: P2

## Problem

The blueprint `v0.8.0` conformance deleted `.icm/project.json` on 2026-10-26. The stub `.icm/intake/triage/_done/neon-uat-branch-limit-blocks-previews.md` still names it.

## Proposed change

Remove the name from the stub. Keep the Neon project ID that the line gives.

## Acceptance criteria

- [ ] `git grep project.json` on `main` finds no match.
