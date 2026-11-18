# Database — fixed databases, and migrations that CI proves

Language: pt-PT

## Purpose

Each migration is proven before it reaches a shared database. No database is made for a
pull request.

## Inputs

- `package.json`: `db:migrate` applies the migrations. `db:verify` (optional) examines the
  schema. `check:migrations` (optional) examines the order against the base branch.
- The setup act `.icm/setup/databases.md`.

| Database | Reads it | Migrates on |
|---|---|---|
| A new, empty Postgres of the job `code` | the tests in CI | each run of `ci` |
| The shared preview database | each preview | each push to a pull request, after `code` is green |
| UAT | UAT | each merge to `main` |
| Production | production | the promotion, before the code moves (`features/uat.md`) |

## Process

1. **Only CI migrates.** The job `code` applies each migration from zero, then the tests
   run on that database. The job `database` then migrates the shared database of the event.
   One run at a time for each database. No build command migrates.
2. **Migrations go forward only.** A migration must work with the code that serves while it
   runs. Add a column first, use it in the next release, and remove an old one last.
3. **Write a migration** with the tool of the repo. Do not edit a migration that is on
   `main`. Do not run a migration on a computer against a shared database.
4. **The mixed preview database.** Two pull requests can each apply a migration to the
   shared preview database. When a preview fails because of the other pull request, the
   operator says "reset the preview database". The session runs
   `gh workflow run db-reset.yml -f ref=<the branch to test>`. The workflow empties the
   preview database, copies UAT into it, and applies the migrations of that branch.
5. **A failed migration** stops its job. The shared database keeps its last good schema.
   Read the job. A dropped connection: run the job again. A fault in the migration: fix it
   forward, as a new migration on the branch.

## Outputs

- A green job `code`: each migration applies from zero, and the tests pass on it.
- Each shared database at the schema of its code.

## Gates

None. The operator's word starts a reset.
