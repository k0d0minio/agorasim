# Stub: The repo renders from the blueprint v1.0.0

- lane: chore
- found-by: house triage `conformance-v1-0-0.md` · 2026-10-27
- complexity: low
- priority: P1

## Problem

The repo renders from the blueprint `v0.8.0`. It has no lanes, no merge script after Jamie's
tick, no release script and no database contract. `.copier-answers.yml` names no `database`
answer.

## Proposed change

Run `copier update` to `v1.0.0` with every answer by `--data`. Align `CLAUDE.md` with the
blueprint's `template/CLAUDE.md.jinja` at `v1.0.0`.

## Acceptance criteria

- [ ] `.copier-answers.yml` names `v1.0.0`. Its answers are `workspace: false`, `monorepo: true`, `release: true`, `uat: true`, `database: neon` and `migrations_path: web/drizzle`.
- [ ] The blueprint's files equal its render at `v1.0.0` for these answers.
- [ ] `CLAUDE.md` follows `template/CLAUDE.md.jinja` at `v1.0.0` for a monorepo, release, UAT and Neon build, with the Apps and packages table.
- [ ] The `check` run of `ci` is green.
