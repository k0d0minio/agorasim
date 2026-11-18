# Agorasim — app

Agorasim's site and booking platform: guided classic-car tours of the Saloia region (Sintra,
Mafra, Ericeira), a bilingual PT/EN site with booking through Stripe Checkout and a phone-first
admin console. One repository of several apps and shared packages. The work pipeline is the
BAXTER blueprint (`.icm/_system/`, version in `.icm/_system/VERSION`, answers in
`.icm/.copier-answers.yml`). This file is identity and routing only. The rules live once, in the
files that it points at.

## Apps and packages

| Path | Is | Deploys as |
|---|---|---|
| `web/` | the site, the booking flow and the admin console (Next.js, bilingual PT/EN) | the Vercel project `agorasim` (root `web`) |
| `workspaces/` | the ICM content pipelines that write into `web/src/content/generated/` | — |

## Routing

@.icm/_system/ROUTER.md

The router has the commands, the stages and the lanes. A ticket is a Linear key of the team
`JAM`. The files below belong to this repo.

| You are asked to | Go to |
|---|---|
| understand the app, its stack and its data, or write code | `README.md` and `web/AGENTS.md` |
| answer a question about the build, or review | read and answer. No ticket, no branch, no pull request |
| read a decision, an epic or a stub of the backlog of before 2026-11-18 | `.icm/intake/README.md`, and `.icm/local/ROUTES.md` for the markdown stubs |
| read product knowledge | `.icm/docs/` |
| read where the build runs | `.icm/environments.md`, the one home of the addresses |
| read the UAT batch, record the client's sign-off, promote, roll back | `.icm/_system/features/uat.md`, then `.icm/_system/scripts/promote.sh` |
| change the database, or read where a preview's database comes from | `.icm/local/database.md` (the rule of today), then `.icm/_system/features/database.md` |
| do a setup act in Vercel, GitHub or the database provider | `.icm/setup/`: one file for each act. A person ticks its boxes |
| change what CI checks or how a release is cut | the blueprint. `ci.yml`, `promote.yml`, `db-reset.yml` and `icm.yml` come from it |

## Release

`ci.yml` runs the checks on each push to `main` and on each pull request that is ready. Its
release job keeps the release-please pull request open on `main`, and that pull request is the
batch. Every merge to `main` deploys UAT at `uat.agorasim.pt` and builds a production deployment
that stays staged. Production moves on a promotion, as `.icm/_system/features/uat.md` says: the
client says yes on UAT, then Jamie says `release`, then Jamie says `promote`. The workflow
`promote` migrates production and promotes the staged build. The UAT database is the default
branch of the Neon project `uat-agorasim`, the base of every preview
(`.icm/local/database.md`).

## Rules

- Client-facing text in `pt-PT`, with the `en` version kept in sync (the site is bilingual).
  Code, commits and notes in English.
- Technical text (pull request bodies, commits, questions) in Simplified Technical English:
  short active sentences, one instruction each, no semicolons. A question for Jamie has a
  number and a default answer.
- CI is truth: never run build, lint, typecheck, test, format or dev locally. Push, then read
  the `ci` run and the previews. `.claude/hooks/block-local-checks.sh` blocks the commands.
- Secrets never in git: names only, values in GitHub or Vercel settings. Flag any plaintext
  credential found.
- One ticket is one run, one branch and one pull request.
- `main` changes by pull request. Gates are human checkboxes: read them, never tick them.
  Jamie ticks Ready to merge. The Release stage merges.
- A ticket's merge reaches the UAT environment, where the client tests the batch. Production
  moves only on Jamie's word, after the client's sign-off (`.icm/_system/features/uat.md`).
- Linear: BAXTER makes the tickets and moves their states. A session in this repo does not
  write to Linear.
