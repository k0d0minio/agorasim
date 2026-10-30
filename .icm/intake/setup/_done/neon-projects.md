> Done: Jamie, 2026-10-30. Checked via the Neon API: the projects `agorasim` and
> `uat-agorasim` exist, both `aws-eu-central-1`. `.icm/environments.md` already names both.

# Setup: the Neon projects

- setup-slug: neon-projects
- needs: database neon
- where: the Neon console → the organisation

## Why

Production's data lives in `agorasim`. Every other deployment reads `uat-agorasim`, so
production's data never reaches a preview.

## Steps

1. In the Neon console, open the client's organisation.
2. Make the project `agorasim` for production, in the region nearest to the Vercel functions.
3. Make the project `uat-agorasim` for UAT, in the same region.
4. Put test data only in `uat-agorasim`. Never copy production's rows into it.
5. Compare the project names with the column `Database` of `.icm/environments.md`.
   If a name is different, correct the column.

## Done when

- [x] The project `agorasim` exists.
- [x] The project `uat-agorasim` exists, with test data only.
- [x] The column `Database` of `.icm/environments.md` names `agorasim` and `uat-agorasim`.
