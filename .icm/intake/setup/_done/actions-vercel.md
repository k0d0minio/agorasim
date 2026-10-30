> Done: Jamie, 2026-10-30. Checked via GitHub Actions: the secret `VERCEL_TOKEN` and the
> variable `VERCEL_TEAM` exist. `.icm/scripts/promote.sh status` ran and reached `ci on main`;
> the UAT-project listing needs `VERCEL_TOKEN` in the running shell, which the script already
> reads from Actions in CI.

# Setup: the Vercel token and team in GitHub Actions

- setup-slug: actions-vercel
- needs: uat
- where: GitHub → the repository → Settings → Secrets and variables → Actions

## Why

`promote.yml` and the UAT scripts read Vercel with these two names. Without them, no promotion
runs.

## Steps

1. In Vercel, make a token for the team. Give it the smallest scope that reads and promotes
   deployments.
2. In GitHub, add the repository secret `VERCEL_TOKEN` with the token.
3. Add the repository variable `VERCEL_TEAM` with the team's slug.
4. Add no variable that names a project. The scripts find the projects.

## Done when

- [x] The repository has the secret `VERCEL_TOKEN`.
- [x] The repository has the variable `VERCEL_TEAM`.
- [x] `.icm/scripts/promote.sh status` lists each UAT project.
