# Agorasim — app

Agorasim's site and booking platform, built by Legible Consulting: guided classic-car tours of
the Saloia region (Sintra, Mafra, Ericeira), a bilingual PT/EN site with booking through Stripe
Checkout and a phone-first admin console. The product is in `web/`. The repo tracks
`legible-consulting/blueprint` through `.copier-answers.yml`. This file is
identity and routing only.

## Routing

| You are asked to | Go to |
|---|---|
| build the next ticket, or any ticket | `.icm/intake/CONTEXT.md` (the loop), then the stub |
| fix a bug, make a tweak or do a chore, with or without a stub | `.icm/lanes/<lane>/CONTEXT.md`: `bug`, `tweak` or `chore` |
| fix a fault that production shows now | `.icm/lanes/hotfix/CONTEXT.md` |
| do work that has no ticket | `.icm/intake/CONTEXT.md` § A request with no stub |
| answer a question about the build, or review | read and answer. No stub, no branch, no pull request |
| open, fill or finish a pull request | `.github/pull_request_template.md`. The gates sit at its top |
| merge after the tick, release or promote | `.icm/intake/CONTEXT.md` § The loop, step 7, and § After the tick, then `.icm/uat/CONTEXT.md` |
| plan new work | `.icm/intake/CONTEXT.md` (an epic with a breakdown), never a loose list |
| understand the app, its stack and its data | `README.md` and `web/AGENTS.md` |
| change what CI checks or how a release is cut | `legible-consulting/.github` (`check-client.yml`, `release.yml`). `ci.yml` here only calls them |
| change a file the blueprint renders | the blueprint, then `copier update` here |
| change the database, or read where a preview's database comes from | `.icm/database/CONTEXT.md`, then `preview-db.sh` |
| read the UAT batch, record the client's sign-off, roll back | `.icm/uat/CONTEXT.md` (the whole UAT contract), then its scripts |

## Release

Every merge to `main` deploys UAT at `uat.agorasim.pt` and builds a production deployment that
stays staged. The release-please pull request from `ci.yml` is the batch. Production moves on a
promotion. The client says yes on UAT. On Jamie's word, the session records it with
`.icm/scripts/promote.sh approve --by "<who>"`. On Jamie's word `release`, the session merges the
release pull request with `.icm/scripts/release.sh`. That merge makes the tag and the changelog
and moves nothing. On Jamie's word `promote`, the session dispatches `promote.yml` with that tag,
through `.icm/scripts/promote.sh run`. That run migrates production and promotes the staged
build. The rule is `.icm/uat/CONTEXT.md`. The UAT database is the default branch of the Neon
project `uat-agorasim`, the base of every preview (`.icm/database/CONTEXT.md`).

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
- `main` changes by pull request. Gates are human checkboxes: read them, never tick them.
  Jamie ticks Ready to merge, and the session merges with `.icm/scripts/merge.sh`.
  The release is Jamie's word `release` in the session: the session runs `.icm/scripts/release.sh`.
- A ticket's merge reaches the UAT environment, where the client tests the batch. The merge of
  the release pull request makes the release tag and moves nothing. Production moves when the
  session dispatches `promote.yml` with `.icm/scripts/promote.sh run`, on Jamie's word, after the
  session records the client's sign-off (`.icm/uat/CONTEXT.md`).
