# Setup checklist of agorasim

The blueprint wrote this list for the answers of this repo (1.0.0-rc36), from
`.icm/_system/setup/items.json`. It has only the items that apply to this repo.
- (S): a session does it. (J): the operator does it, in a service or with a secret value.
  (B): BAXTER does it, with its data or its tools.

`.icm/_system/scripts/setup.sh` checks each item that it can, and prints the fix of each gap
(`.icm/_system/features/setup.md`). A session ticks the box of an item (S) that has no check,
when it is done. A session does not tick a box of (J) or (B). An item that starts with
"Optional" is the operator's choice: its gap is flagged, and it never stops a run.

## Render the blueprint
- [ ] (S) Run `bin/update-repo.sh <repo>` of the blueprint on a clean tree at `origin/main`. The script does not commit. `render.update`
- [ ] (S) Read `.icm/project.json`. The update adds each missing key and keeps each value. Write each empty value that this repo needs. `render.project-json`
- [ ] (S) Write `.icm/environments.md`: one row for each environment (the address, the Vercel project, the database, what moves it). `render.environments`
- [x] (S) Write `.icm/project-rules.md`: the stack, the names, the code conventions. When the script `dev` is not the correct command, add `- dev server: <command with {port}>`. `render.project-rules`
- [ ] (S) `CLAUDE.md` imports `.icm/_system/ROUTER.md` and routes the files of this repo. `render.claude-md`

## GitHub
- [ ] (J) Optional (J decides for each repo, 1.0.0-rc38): a ruleset on `main` makes these checks necessary: `secrets`, `workflows`, `icm-check` and `code`. (`github-checks.md`) `gh.ruleset`
- [ ] (S) No workflow calls `legible-consulting/.github`. `gh.legacy`
- [ ] (J) Code security: Dependabot alerts on, and Dependabot security updates on. (`dependabot-security.md`) `gh.dependabot`
- [ ] (J) Optional, for a repo with `turbo.json` (1.0.0-rc40): the Actions secret `TURBO_TOKEN` and the Actions variable `TURBO_TEAM` give the job `code` the remote cache of turbo. (`github-checks.md`) `gh.turbo-cache`
- [ ] (J) The Actions secret `VERCEL_TOKEN` and the Actions variable `VERCEL_TEAM`. (`actions-promote.md`) `gh.vercel-token`
- [ ] (J) The same token in the keyring of BAXTER, key `vercel_token`, account = the team (step 4). (`actions-promote.md`) `gh.keyring-token`
- [ ] (J) Settings, Actions, General: "Allow GitHub Actions to create and approve pull requests" is on. (`actions-promote.md`) `gh.pr-permission`

## Vercel and UAT
- [ ] (J or B) The Vercel project is linked to this repo. The custom environment `uat` follows `main`, with the domain `uat.<domain>` and its DNS record. (`vercel-uat.md`) `uat.project`
- [ ] (J or B) "Auto-assign Custom Production Domains" is off. `promote.sh status` prints no `SETUP:` line. (`vercel-uat.md`) `uat.auto-assign`
- [ ] (J) Each variable of the app is on `uat`, with sandbox keys only. `uat.variables`
- [ ] (J) A merge to `main` opens or updates the release pull request. `uat.release-pr`

## Database
- [x] (S) This repo has no database answer. Write the database rule of this repo in `.icm/project-rules.md`, or write that it has no database. `db.rule`

## Request button
- [ ] (S) The root layout has `<RequestButton />` after `{children}`. The form has the language of `.icm/project.json`. (`request-button.md`) `rb.layout`
- [ ] (S) The route `app/api/baxter-request/route.ts` (or below `src/`, or in the app of a monorepo) exports `POST` again. (`request-button.md`) `rb.route`
- [x] (S) Optional `user`. The Content-Security-Policy permits a POST to the same origin. TypeScript and ESLint accept `.icm/_system/request-button/`. On a local dev server the button shows, and an empty POST to the route gets 400. (`request-button.md`) `rb.config`
- [ ] (J) Vercel `uat`: `BAXTER_REQUEST_ENV` = `uat` (not on production), and `BAXTER_REQUEST_LINEAR_API_KEY`. The label `requests.linear_label` exists in the team `JAM`. (`request-button.md`) `rb.env`

## Checktest
- [ ] (S) The seed script `seed:test-roles` of the contract in `checktest-accounts.md`. (`checktest-accounts.md`) `ct.seed`
- [ ] (B) The test passwords are in the data of BAXTER, never in this repo. Storyboards exist for this repo. (`checktest-accounts.md`) `ct.baxter`
- [ ] (J) After the checktest signs up the admin account on UAT, run the seed one time. The UAT database address comes from the keyring of BAXTER for that one command. Never write it in a file. (`checktest-accounts.md`) `ct.seed-run`

## Linear
- [ ] (B) The org `kodominio` is in the keyring of BAXTER. `li.org`
- [ ] (S) `linear.writes` of `.icm/project.json` is `session`. `li.writes`
- [x] (S) `linear.states` of `.icm/project.json`: the state names of the team `JAM`. An empty name: no state move at that event. `li.states`

## Close
- [x] (S) CI is green on the setup pull request, and the Vercel preview builds. `close.ci`
- [ ] (J) Tick each box of the other files of `.icm/setup/` when its act is done. `close.acts`
