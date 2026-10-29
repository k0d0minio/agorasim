# Where the build runs

| Environment | Address | Vercel project | Database | Moves on |
|---|---|---|---|---|
| Production | <agorasim.pt is not on the Vercel project on 2026-10-29. Its one production domain is https://agorasim.jamienisbet.com> | `agorasim` | the default branch of the Neon project `agorasim` | `promote.sh run --tag <tag>`, on Jamie's word |
| UAT | https://uat.agorasim.pt | `agorasim` | the default branch of the Neon project `uat-agorasim` | every merge to `main` |
| Preview | the pull request's Vercel preview | `agorasim` | the Neon branch `preview/<branch>` in `uat-agorasim`, made by the Neon integration | every push to the branch |

This table is the one home of where the build runs. The blueprint's files read it and never
repeat it. The blueprint owns this file: `copier update` merges a new tag into it three ways,
so a cell that a person filled stays filled.
A monorepo has one row per environment and Vercel project. Copy the rows of each environment
once for each app that deploys.
Each setup stub in `.icm/intake/setup/` names the cells that it fills.
A person fills each `<…>` cell that no setup stub fills, when the project or the domain exists.
The UAT contract: `.icm/uat/CONTEXT.md`.
The database contract: `.icm/database/CONTEXT.md`.
