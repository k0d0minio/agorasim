# Where the build runs

| Environment | Address | Vercel project | Database | Moves on |
|---|---|---|---|---|
| Production | https://prod.agorasim.pt. `agorasim.pt` moves to Vercel at the first promotion to production, after the client's approval | `agorasim` | the default branch of the Neon project `agorasim` | `.icm/_system/scripts/promote.sh run --tag <tag>`, on Jamie's word |
| UAT | https://uat.agorasim.pt | `agorasim` | the default branch of the Neon project `uat-agorasim` | every merge to `main` |
| Preview | the pull request's Vercel preview | `agorasim` | the Neon branch `preview/<branch>` in `uat-agorasim`, made by the Neon integration | every push to the branch |

This table is the one home of where the build runs. The blueprint's files read it and never
repeat it. This file belongs to the repo. The scripts find the Vercel project from the git link
of the repo, not from this file.
A monorepo has one row per environment and Vercel project. Copy the rows of each environment
once for each app that deploys.
The UAT contract: `.icm/_system/features/uat.md`.
The database contract: `.icm/local/database.md`.
