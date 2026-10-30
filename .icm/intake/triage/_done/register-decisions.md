# Stub: Restore the project register's standing decisions into the intake README

- lane: chore
- found-by: house#166 · 2026-10-30
- complexity: low
- priority: P2

## Problem

The blueprint keeps no project register. Agorasim's register `.icm/project.md` was removed
on 2026-10-27 (commit `5c8eef6`). Sixteen of its decisions still bind the build, and they
have no home.

## Proposed change

Add a `## Decisions` section to `.icm/intake/README.md` with the 16 decisions still in
force, each restated against the code on `main` today. Repoint the files that still name
the removed register.

## Acceptance criteria

- [ ] `.icm/intake/README.md` § Decisions holds the 16 rules below, one line each, with its
  why and its date, and no ID.
- [ ] No file names `.icm/project.md` or the register's D numbers, except the stub and the
  commit messages.
