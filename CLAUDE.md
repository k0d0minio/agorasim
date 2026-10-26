# Agorasim — app

Agorasim's site and booking platform, built by Legible Consulting: guided classic-car tours of
the Saloia region (Sintra, Mafra, Ericeira), a bilingual PT/EN site with booking through Stripe
Checkout and a phone-first admin console. The product is in `web/`. The repo tracks
`legible-consulting/blueprint` (tier `app`) through `.copier-answers.yml`. This file is
identity and routing only.

## Routing

| You are asked to | Go to |
|---|---|
| build the next ticket, or any ticket | `.icm/intake/CONTEXT.md` (the loop), then the stub |
| open, fill or finish a pull request | `.github/pull_request_template.md`. The gates sit at its top |
| plan new work | `.icm/intake/CONTEXT.md` (an epic with a breakdown), never a loose list |
| understand the app, its stack and its data | `README.md` and `web/AGENTS.md` |
| change what CI checks or how a release is cut | `legible-consulting/.github` (`check-client.yml`, `release.yml`). `ci.yml` here only calls them |
| change a file the blueprint renders | the blueprint, then `copier update` here |
| read the UAT batch, record the client's sign-off, promote, roll back | `.icm/uat/CONTEXT.md` (the whole UAT contract), then its scripts |

## Release

Every merge to `main` deploys UAT at `uat.agorasim.pt` and builds a production deployment that stays
staged. The release-please pull request from `ci.yml` is the batch. Production moves on a
promotion: the client says yes on UAT, Jamie records it with
`.icm/scripts/promote.sh approve --by "<who>"`, merges the release pull request, which makes the
tag and the changelog and moves nothing, then dispatches `promote.yml` with that tag. That run
migrates production and promotes the staged build. The rule is `.icm/uat/CONTEXT.md`. The UAT
database is the default branch of the Neon project `uat-agorasim`, the second Neon project the
contract allows.

## Rules

- Client-facing text in `pt-PT`, with the `en` version kept in sync (the site is bilingual).
  Code, commits and notes in English.
- Technical text (stubs, pull request bodies, commits, questions) in Simplified Technical
  English: short active sentences, one instruction each, no semicolons. A question for Jamie
  is numbered and carries a default answer.
- CI is truth: never run build, lint, typecheck, test, format or dev locally. Push, then read
  the `ci` run.
- Secrets never in git: names only, values in GitHub or Vercel settings.
- One ticket is one branch and one pull request. The pull request moves the stub to `_done/`.
  Gates are human checkboxes: read them, never tick them.
- `main` changes by PR. The merge is a human's.
- A ticket's merge reaches the UAT environment, where the client tests the batch. The merge of
  the release pull request makes the release tag and moves nothing. Production moves when Jamie
  dispatches `promote.yml` with that tag, after the client's sign-off is recorded. A session
  never merges it and never dispatches it (`.icm/uat/CONTEXT.md`).
