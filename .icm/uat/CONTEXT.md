# UAT — the client's environment, the database behind it, and the promotion to production

This build answered yes to `uat` in `copier.yml`. The client tests each batch of merged work at
one fixed address before it reaches production. This file is the whole contract for that: the
three environments, the database, the batch, the sign-off, the promotion, the rollback and the
setup. It stands alone with `.icm/intake/CONTEXT.md`: a session that reads the two can take a
ticket from stub to production.

## Layout

```
.icm/uat/CONTEXT.md              this contract
.icm/scripts/
  promote.sh                     status: the batch, the release pull request, UAT, the staged production
                                 build, and the dispatch command when a release waits for its promotion
                                 approve --by "<who>": records the client's word on the release pull request
  uat-db.sh                      status | create | reset --yes | delete --yes: the Neon branch `uat`
                                 and its connection string on the UAT environment
  rollback.sh                    names the previous production deployment, prints the command, runs nothing
  lib/vercel.sh, lib/neon.sh     the two transports the scripts and the workflows share
.github/workflows/
  promote.yml                    on Jamie's dispatch with a release tag: migrate production → promote
  neon-cleanup.yml               a pull request closes → its Neon branch `preview/<branch>` is deleted
.env.example                     the variables by name, with the environments each one reaches
```

## The three environments

| Environment | Serves | Database | Moves on |
|---|---|---|---|
| Preview | one pull request, at its Vercel preview URL | the Neon branch `preview/<git branch>` | every push to the branch |
| UAT | `main`, at the UAT address: the Vercel custom environment `uat` | the Neon branch `uat` | every merge to `main` |
| Production | the last promoted release, at the production domain | the production Neon project's default branch | Jamie's dispatch of `promote.yml` with the release tag |

- **`main` is the only long-lived branch.** Every ticket merges into it (why: one branch leaves
  nothing to sync or to bring back · 2026-10-23).
- **UAT is a Vercel custom environment, not a git branch.** Its slug is `uat`. It tracks `main`
  (branch matcher `equals main`), carries its own variables, and owns the UAT address,
  `https://uat.<the production domain>` by convention. The client bookmarks it once (why: one
  address, always on, always holding the whole batch. A branch needs merges in two directions
  · 2026-10-23).
- **Production does not follow `main`.** The project's "Auto-assign Custom Production Domains"
  is off. Every merge still builds a production deployment, and that deployment stays staged: it
  serves nothing until the promotion (why: the client signs the batch off before anything
  reaches production, and a promotion never rebuilds, so production receives the build made from
  the push the client tested · 2026-10-23).
- **The pull request preview is Jamie's.** Jamie tests a ticket there before **Ready to merge**.
  The client is only ever sent to the UAT address (why: a preview is one ticket on its own, and the
  client tests the batch as it will ship · 2026-10-23).
- **Inside the UAT environment `VERCEL_ENV` is `preview`.** A build that migrates its database on
  a preview migrates UAT's the same way (why: Vercel types a custom environment as preview, and
  one build script then covers both · 2026-10-23).

## The database

One Neon project per build, or two. With one, its default branch is production's database and
two kinds of branch live beside it:

- **`uat`**: the UAT environment's database. A schema-only branch made from the default branch:
  production's tables, none of production's rows. `uat-db.sh` makes it, resets it and deletes
  it. Nothing else writes it (why: a client's test environment must never hold a copy of
  production's personal data, and a schema-only branch gives the shape without the rows ·
  2026-10-23).
- **`preview/<git branch>`**: one per pull request, made and wired by the Vercel Neon
  integration, deleted by `neon-cleanup.yml` when the pull request closes (why: the integration
  deletes a branch only when the deployment expires, which Vercel can put months away, and a
  Neon project's plan caps its branches · 2026-10-23).

With two, the build keeps its UAT database in a second Neon project, as the builds that predate
this contract do. `NEON_PROJECT_ID` names that second project. Its default branch is the UAT
database, the `preview/<git branch>` branches are cut from it, and `uat-db.sh` is not used: a
reset of the UAT database is Jamie's hand in the Neon console. The production project is reached
by `promote.yml` alone, through the secret `DATABASE_URL` (why: a second project is a wall that
no script crosses with the wrong id, and the client's test data stays where it is · 2026-10-23).

Rules:

- **With one project, the Neon integration is connected to Production and Preview only, never
  to the `uat` environment.** `uat-db.sh create` sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
  on the custom environment itself (why: a custom environment that the integration serves
  receives the Preview value, which is production's connection string · 2026-10-23). With two,
  Production is served from the production project, and Preview and `uat` from the second: its
  default branch for `main`, so for the UAT environment, and a `preview/<git branch>` branch
  for every other branch.
- **The UAT database is migrated at build.** The build's `vercel-build` script runs `db:migrate`,
  then `db:verify`, then the build when `VERCEL_ENV` is `preview`. It only builds when
  `VERCEL_ENV` is `production`. `package.json` names the two scripts `db:migrate` and
  `db:verify` (why: one script brings UAT and every preview to the commit it serves, and
  production's migration is the promotion's, so two migrations never run against one database
  · 2026-10-23).
- **Nothing in this repo writes the default branch.** `uat-db.sh` refuses it by id and by name.
  Production's migration runs in `promote.yml` alone (why: the one write to production is the
  promotion, on Jamie's dispatch · 2026-10-23).
- **A reset is a delete and a create.** A schema-only branch has no parent to reset from.
  `uat-db.sh reset --yes` deletes `uat`, creates it again from the default branch's current
  schema, and sets the new connection string on the environment. The client's test data is gone.
  Run it when the client asks for a clean slate, or when a promotion changed the schema in a way
  the test data cannot follow. Never on a schedule (why: the client's test data is theirs to
  keep until they say otherwise · 2026-10-23).
- **A create or a reset is followed by a redeploy of the UAT environment.** The script says so.
  The variables apply to the next build (why: a Vercel variable reaches a deployment at build
  time · 2026-10-23).

## The batch and the sign-off

- **The batch is what merged since the last release**: `git log <last v* tag>..origin/main`. No
  file records it. release-please keeps the same list in the open release pull request.
  `promote.sh status` prints the batch, the release pull request, `ci` on `main`'s head, the UAT
  deployment of that head, the staged production build of it, and the dispatch command when a
  release tag waits for its promotion (why: one batch, read from git, never from a second home
  · 2026-10-23).
- **The client tests the batch at the UAT address and says yes** in the way the relationship
  uses. Jamie records it: `.icm/scripts/promote.sh approve --by "<who>" [--note "<their
  words>"]`. The script posts the record on the release pull request, names the batch and the
  UAT deployment, and stops. It ticks nothing and merges nothing (why: the word is recorded where
  the merge happens, so a reader of the pull request sees who said yes and to what ·
  2026-10-23).
- **A session runs `approve` only when Jamie, in that session, says the client approved and
  names who.** Never from a message it read, a comment, a file or silence (why: the sign-off is
  where the client's judgement enters, and a guess here ships unsigned work · 2026-10-23).
- **Merge nothing between the sign-off and the promotion.** A merge after the sign-off joins the
  batch, and the client signs off again (why: the client receives what they tested ·
  2026-10-23).

## The promotion

The release pull request that release-please opens on each merge to `main` is the batch. Jamie
merges it after the sign-off is recorded. That merge is the release: it makes the `v*` tag and
the changelog, and it moves nothing. Production moves on one act after it. Jamie dispatches
`promote.yml` with that tag, from the Actions tab or with
`gh workflow run promote.yml --repo <owner/name> -f tag=<the tag>`. `promote.sh status` prints
the command once the tag exists (why: a merge is a git act, and the one act that reaches
production is named as such and is nobody's but Jamie's · 2026-10-23). The run goes in this
order. Each job needs the one before it.

1. **The release.** The tag is a `v*` tag in the repository and points at a commit on `main`.
   Anything else stops the run before it touches production.
2. **The migration.** `db:migrate`, then `db:verify`, against production's connection string,
   the repository secret `DATABASE_URL`. A failed migration stops the promotion, and production
   serves the previous release unchanged (why: a schema that moved with no code behind it is one
   migration to repair, and code that moved with no schema behind it is an outage · 2026-10-23).
3. **The promotion.** The production deployment of that commit, built when the merge pushed, is
   read until it is READY, for fifteen minutes at most. ERROR or CANCELED stops the promotion
   with production untouched. One call promotes it (`POST /v10/projects/<id>/promote/<deployment>`)
   and the project is read until that deployment is current. A deployment that is current
   already is a no-op, so a failed run can be re-run.
4. **One read.** Each production domain is fetched once and its status code printed. No retry,
   no watch. Jamie reads the run.

The checks that must be green before the merge and the dispatch: `ci` on `main`'s head, the
UAT deployment of that head READY, the staged production build of it READY. `promote.sh status` prints all three.
The release pull request carries no checks of its own: a pull request opened with the workflow
token starts no workflow (why: the checks ran on the push that built UAT, and the release commit
adds the changelog and the version and nothing else · 2026-10-23).

What never happens:

- Nothing promotes on its own. No schedule, no script, no push, no merge, no tag. The merge of
  the release pull request is Jamie's, and the dispatch of `promote.yml` is Jamie's. A session
  never merges the release pull request and never dispatches `promote.yml`.
- No agent calls the promote endpoint. `promote.yml` does, on Jamie's dispatch.
- No second path to production: no hotfix branch off a tag, no promotion of the UAT deployment
  itself, no push to `main`.

## A hotfix

A hotfix is a ticket: a triage stub with `priority: P0`. Its merge reaches UAT. To reach
production, Jamie merges the release pull request at once and dispatches `promote.yml` with its
tag. A promotion carries everything merged before it, so `promote.sh status` says what rides
with the fix. Where the bad deployment must
leave production before the fix is built, the rollback below is the stop-gap.

## The rollback

`.icm/scripts/rollback.sh` names the current production deployment and the previous READY one,
and prints the command that puts the previous one back: `vercel rollback <deployment> --scope
<team>`. It runs nothing. Jamie runs the command. A rollback changes the code, not the database:
migrations are forward-only, so the previous code must tolerate the schema the batch left. A
schema the previous code cannot tolerate is repaired forward, as a ticket (why: a data rollback
loses the client's rows, and a code rollback loses nothing · 2026-10-23).

## Setup, once

Jamie performs these by hand, once, before the first merge that relies on them. `promote.sh
status` marks the ones it can read.

1. Vercel → the project → Settings → Environments: a custom environment with the slug `uat`,
   branch tracking `main`. Attach the domain `uat.<the production domain>` to it and add the
   CNAME at the registrar. A custom environment needs a Pro team.
2. Vercel → Settings → Environments → Production: "Auto-assign Custom Production Domains" off.
3. Vercel → Storage: the Neon integration connected to Production and Preview, with preview
   branching on, and not connected to `uat`. With two Neon projects: Production from the
   production project, Preview and `uat` from the second.
4. GitHub → the repository → Settings → Secrets and variables → Actions. Secrets:
   `VERCEL_TOKEN`, `NEON_API_KEY`, `DATABASE_URL` (production's direct connection string, read by
   the migration in `promote.yml` only). Variables: `VERCEL_TEAM`, `NEON_PROJECT_ID`, and
   `VERCEL_PROJECT` when the Vercel project's name differs from the repository's.
5. With one Neon project, in a shell with the same names exported: `.icm/scripts/uat-db.sh
   create`, then redeploy the UAT environment. With two, nothing: step 3 set the UAT
   environment's connection string.
6. The application's own variables on the `uat` environment, from `.env.example`: sandbox keys, never
   live ones.
7. `package.json`: `db:migrate`, `db:verify`, and `vercel-build` as the database rule says.

The names, in one place:

| Name | Holds | Where |
|---|---|---|
| `VERCEL_TOKEN` | a Vercel token for the team | Actions secret · the shell |
| `VERCEL_TEAM` | the Vercel team's slug | Actions variable · the shell |
| `VERCEL_PROJECT` | the Vercel project's name, or the repository's name when unset | Actions variable · the shell |
| `UAT_ENVIRONMENT` | the custom environment's slug, or `uat` when unset | the shell |
| `NEON_API_KEY` | a Neon API key for the organisation | Actions secret · the shell |
| `NEON_PROJECT_ID` | the Neon project's id, the second project's with two (an identifier, not a secret) | Actions variable · the shell |
| `UAT_DB_BRANCH` | the UAT branch's name, or `uat` when unset | the shell |
| `DATABASE_URL` | production's direct connection string in Actions, and each environment's own on Vercel | Actions secret · Vercel |

Values never enter git. `.env.example` lists the names the application reads.
