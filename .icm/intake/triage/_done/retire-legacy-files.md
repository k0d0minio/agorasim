# Stub: The legacy map and the project register leave the repo

- lane: chore
- found-by: house triage `conformance-v1-0-0.md` (retire list) · 2026-10-27
- complexity: low
- priority: P2

## Problem

`.icm/CONTEXT.md` is the map of the old pipeline. It describes `uat-db.sh`, which the blueprint `v1.0.0` deletes. The `v1.0.0` `CLAUDE.md` routes now. `.icm/project.md` is the project register that the retired `/project` skill wrote. The blueprint `v1.0.0` has no place for it. Jamie decided on 2026-10-27 to remove both files.

## Proposed change

Delete `.icm/CONTEXT.md` and `.icm/project.md`. Change each file that names them, so that it says the register was removed and its last version is in the git history. The house triage stub `project-register-in-blueprint` decides where a later blueprint keeps a register.

## Acceptance criteria

- [ ] `.icm/CONTEXT.md` and `.icm/project.md` do not exist.
- [ ] `CLAUDE.md` and `README.md` do not name either file as a file that exists.
- [ ] `web/src/content/terms.ts` and the geo-content research output point at the git history for the register.

## Out of scope

- A new place for the register's facts. The house stub `project-register-in-blueprint` decides it.
