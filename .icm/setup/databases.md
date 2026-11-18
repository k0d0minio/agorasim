# Setup: the three databases

- where: the database provider, Vercel → each project → Settings → Environment Variables,
  and GitHub → the repo → Settings → Secrets and variables → Actions

## Steps

1. Make the databases. Each is a database of its own, not a branch for each pull request:
   - production
   - UAT
   - the shared preview database
2. In Vercel, set `DATABASE_URL` (pooled) on each environment: Production gets production, `uat` gets UAT, and Preview (all branches) gets the shared preview database.
3. Turn off each integration setting that makes a database branch for each preview, and
   delete the branches that it made.
4. Add the repo secrets, each a direct connection string (not pooled):
   `DATABASE_URL` (production), `UAT_DATABASE_URL`, `PREVIEW_DATABASE_URL`.
5. In `package.json`: `db:migrate` applies the migrations, and `db:verify` (optional)
   checks the schema. No build command migrates: remove `vercel-build.sh` and each
   migration from the build lines.
6. Copy the data of UAT into the preview database one time:
   `gh workflow run db-reset.yml -f ref=main`.

## Done when

- [ ] The job `database` of the workflow `ci` is green on a pull request and on `main`.
- [ ] A preview reads the shared preview database.
- [ ] No database branch for a pull request exists.
