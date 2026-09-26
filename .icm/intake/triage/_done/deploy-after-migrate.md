# Stub: The Production deploy races db-migrate on main
> Done elsewhere — retired 2026-09-26 (estate audit): superseded by D39/D43 — `release.yaml:282` promotes only after `db-migrate.yml`; `ci.yml` no longer runs on push to main (#128, #133).

- lane: chore
- found-by: tech lens (/project) · 2026-09-18 — decision D21 (discipline now, this later)
- priority: P2

## Problem

A schema-changing push to `main` starts `.github/workflows/db-migrate.yml` and the Vercel
Production build in the same second (observed 2026-09-17 on `a271fe8`); new code can serve
requests against the old schema until the migration lands — the workflow's own comment
names the 42703. Two column-adding migrations shipped in twelve days (#83, #101). `ci.yml`'s
`cancel-in-progress` on `main` also means a superseded SHA is never verified. `main` cannot
be branch-protected on this plan (private, free tier).

## Proposed change

Turn off Vercel's auto-deploy for `main` and run `vercel deploy --prod` as the last step of a
`main` workflow that runs after `db:migrate` + `db:verify` succeed — which also makes CI the
actual gate on Production. Runbook §H and `go-live-on-landing` already read as D21 says.

## Prompt

In the agorasim repo, read `.icm/intake/triage/deploy-after-migrate.md`. Propose the workflow
change and the Vercel setting it needs (the setting is Jamie's to flip), implement the
workflow so Production deploys from Actions after migrate + verify, and document it in
`.icm/_shared/project-rules.md` → The factory. `git mv` the stub to `_done/` in the PR, on a
`claude/` branch; CI is the source of truth.
