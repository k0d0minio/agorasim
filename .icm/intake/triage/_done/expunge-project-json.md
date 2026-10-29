# Stub: No file names the retired project manifest

- lane: chore
- found-by: Jamie · 2026-10-29
- complexity: low
- priority: P2

## Problem

The blueprint `v0.8.0` conformance deleted the project manifest from `.icm/` on 2026-10-26. The stub `.icm/intake/triage/_done/neon-uat-branch-limit-blocks-previews.md` still names it.

## Proposed change

Remove the name from the stub. Keep the Neon project ID that the line gives.

## Acceptance criteria

- [ ] A search of `main` for the manifest's file name finds no match.
