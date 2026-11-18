# Database — the Neon projects, a branch for each preview, and the migration at build

> This file belongs to the repo. The repo answered `database: none` to the BAXTER blueprint: the
> database model of the blueprint (fixed databases, and only CI migrates) is not adopted. Reason:
> `web` has only the Neon serverless driver, and it cannot reach the plain Postgres of a CI job
> (2026-11-18).

This file is the database rule for
every environment. Three rules make it: isolation by Neon project, a Neon branch for each
preview, and a migration at build that holds a lock.

## Inputs

| Shape | Neon projects | Preview reads | UAT reads | Production reads | Production migrates |
|---|---|---|---|---|---|
| With UAT | `<slug>` and `uat-<slug>` | its own branch of `uat-<slug>` | the default branch of `uat-<slug>` | the default branch of `<slug>` | in `migrate-production.yml`, before `promote.sh run` |
| Without UAT | `<slug>` | its own branch of `<slug>` | — | the default branch of `<slug>` | at the build of `main` |

- **Isolation is by Neon project.** With UAT, only Vercel Production and `migrate-production.yml` reach
  `<slug>`. Each other deployment reads `uat-<slug>` (why: a separate project is the strongest
  wall between the client's production data and a preview · Jamie, 2026-10-28).
- **Neon makes each preview's database.** The Neon integration on Vercel cuts the branch
  `preview/<git branch>` from the default branch, with its data, when the first deployment of
  a git branch starts. It sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` on Preview for that
  git branch. No script and no workflow of this build makes a branch. The workflow
  `neon-preview-cleanup.yml` deletes the branch of each closed pull request (why: the integration makes the branch before the
  build, so no build runs without its database · Jamie, 2026-10-28).
- **No `DATABASE_URL` on Preview for all branches.** A preview without its branch fails its
  build, and never reads or writes the UAT database (why: a shared preview database mixed the test rows
  of each pull request into the client's UAT data · Jamie, 2026-10-28).
- Without UAT, a preview branch copies production's data. A build with personal data in
  production answers yes to `uat`.

## Process

**The migration rule.** `web/package.json` names `db:migrate` and `db:verify`. Its `vercel-build`
line calls the script of this folder:

```json
"vercel-build": "bash ../.icm/local/vercel-build.sh next build"
```

- `.icm/local/vercel-build.sh` runs `db:migrate`, then `db:verify`, then the build command.
  With UAT it skips the migration when `VERCEL_TARGET_ENV` is `production`, because
  production's build runs at the merge to `main`, before the sign-off. The workflow
  `migrate-production.yml` migrates production: `gh workflow run migrate-production.yml -f
  tag=<v*>`, on Jamie's word, after the merge of the release pull request and before
  `promote.sh run`. The workflow `promote` of the blueprint does not migrate. Without UAT, every build migrates, production too.
- Vercel sets `VERCEL_TARGET_ENV` at build, and no person sets it. Without it, the script stops.
- The script gives `db:migrate` and `db:verify` `DATABASE_URL_UNPOOLED` as `DATABASE_URL` when
  it has a value: a migration needs a direct connection.
- **`db:migrate` holds a Postgres advisory lock** for the whole run, and releases it at the
  end. Two builds can migrate one database at the same time: two apps of a monorepo on `uat`,
  or two pushes to one branch. The lock makes the second run wait, then find nothing to apply
  (why: the migration tool does not lock by itself · Jamie, 2026-10-28).
- **A monorepo calls the script from each app's `vercel.json`.** Vercel runs `turbo run build`
  there, not `vercel-build`. Each app that reads the database names `db:migrate` and
  `db:verify` in its own `package.json`, and its `vercel.json` has the line
  `"buildCommand": "bash ../../.icm/local/vercel-build.sh turbo run build"`. The script
  migrates before turbo starts, so `turbo.json` names no variable for it (why: turbo's strict
  mode removes `DATABASE_URL` from a task that `turbo.json` does not name, and a cache hit
  skips the task · 2026-10-28). A package one level below the root calls `../.icm/local/`.
- A migration at build runs while the previous deployment still serves. So a migration must be
  forward-compatible with the code it replaces.

## Outputs

- A Neon branch `preview/<git branch>` for each git branch with a preview, while the git
  branch exists.
- A migrated database for each deployment, before its build. Production with UAT: after the
  sign-off, in `migrate-production.yml`.

## Setup, once

The person acts of this rule are done. Their records are in `.icm/intake/setup/_done/`:

1. `neon-projects`: the Neon project `<slug>`, and with UAT `uat-<slug>`.
2. `neon-vercel-integration`: the integration on each Vercel project of the build. Preview
   from `uat-<slug>` with UAT, or `<slug>` without, with a branch for each preview. Production
   from `<slug>`.
3. `uat-database` (with UAT): `DATABASE_URL` and `DATABASE_URL_UNPOOLED` of `uat-<slug>` on
   the `uat` environment of each UAT project.
4. `github-delete-head-branches`: GitHub deletes the head branch after a merge, so the
   integration deletes its Neon branch.

The session's own setup: `package.json` names `db:migrate` with the lock and `db:verify`, and
the `vercel-build` line above. In a monorepo, each app's `vercel.json` has the `buildCommand`.

| Name | Holds | Where |
|---|---|---|
| `DATABASE_URL` | the pooled connection string of the deployment's database | Vercel: Production and `uat` by the setup, Preview for each git branch by the integration |
| `DATABASE_URL_UNPOOLED` | the direct connection string of the same database | as `DATABASE_URL` |
| `VERCEL_TARGET_ENV` | the deployment's environment, set by Vercel at build and at runtime | Vercel, a system variable |
