# Project rules

This file belongs to the repo. It has the rules that are true for this repo only. Build and
the lanes read it. A rule that is true for all repos belongs in the blueprint, not here.

## The docs folder

- The docs folder for the lane `knowledge` is `.icm/docs/`.
- A page is one markdown file with a lower-case name and hyphens: `launch-runbook.md`.
- A page is in English. It has one `#` heading, and it says what is true today.
- `.icm/intake/README.md` has the decisions of the backlog. It is not a page of the docs.

## The app

- The app is in `web/`: Next.js, React, Tailwind, Drizzle, Stripe Checkout, Vercel Blob.
  Read `README.md` and `web/AGENTS.md` before you write code. This Next.js version differs
  from older versions: read its guide in `web/node_modules/next/dist/docs/` first.
- `workspaces/` has the content pipelines. They write into `web/src/content/generated/`.
- The package manager is pnpm. The root `package.json` names each script that CI runs
  (`lint`, `typecheck`, `test`, `db:migrate`, `db:verify`) and gives it to `web` with
  `--filter web`. A new check needs its name in the root `package.json`.

## The text

- Client-facing text is in `pt-PT`. Keep the `en` version in sync in the same pull request.
- The admin console is Portuguese only and mobile first.
- Code, commits and notes are in English.

## The database

- `web` has only the Neon serverless driver. Do not add a second driver without a ticket
  (JAM-287).
- A schema change is a Drizzle migration in `web/drizzle/`. Never edit a migration that is
  merged. A migration must be forward-compatible with the code that it replaces.
- `.icm/local/database.md` has the database rule. Production migrates in the workflow
  `migrate-production.yml`, on Jamie's word.

## The files

- A committed image in `web/public/images/` is under 5 MB (`web/AGENTS.md`).
- No secret in a file. `.env.example` has names only.
