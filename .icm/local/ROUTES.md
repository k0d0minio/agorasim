# Routes of this repo

Language: en

These routes are in addition to `.icm/_system/ROUTER.md`. They belong to this repo.

## The markdown backlog of before 2026-11-18

Before the BAXTER blueprint, a ticket of this repo was a markdown stub:
`.icm/intake/<epic>/<slug>.md` with a `breakdown.md` for each epic, and
`.icm/intake/triage/<slug>.md`. A finished stub is in a `_done/` folder. On 2026-11-18 the repo
had five open stubs in the epic `seats-and-holds` and six open triage stubs.

A ticket is now a Linear key of the team `JAM`. A stub is not a ticket.

1. To work on a stub, the operator asks BAXTER for its Linear ticket. BAXTER makes it from the
   stub: the title, the sections, and the path of the stub.
2. Start the work with the Linear key, as the router says.
3. In the pull request of that ticket, move the stub into its `_done/` folder.
4. Do not start a run from a stub path: the blueprint of this repo refuses it.

`.icm/intake/README.md` has the order of the backlog and each decision.

## The database

The router sends a migration to `.icm/_system/features/database.md`. Read `.icm/local/database.md`
first: it has the database rule of today, one Neon branch for each preview and a migration at
the build of `web` (`.icm/local/vercel-build.sh`). The rule of the blueprint starts when a person
does the setup act `.icm/setup/databases.md`. The two local files leave at step 5 of that act.

## The app

The app is in `web/`. The root `package.json` names each script that CI runs (`lint`,
`typecheck`, `test`, `db:migrate`, `db:verify`) and gives it to `web` with the filter. Read
`README.md` and `web/AGENTS.md` before you write code.
