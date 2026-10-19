# Agorasim — app

Agorasim's site and booking platform, built by Legible Consulting: guided classic-car tours of
the Saloia region (Sintra, Mafra, Ericeira), a bilingual PT/EN site with booking through Stripe
Checkout and a phone-first admin console. The product is in `web/`. The repo tracks
`legible-consulting/blueprint` (tier `app`) through `.copier-answers.yml`. This file is
identity and routing only.

## Routing

| You are asked to | Go to |
|---|---|
| build the next ticket | `BUILD.md` |
| understand the app, its stack and its data | `README.md` and `web/AGENTS.md` |
| change what CI checks | `legible-consulting/.github` (`check-client.yml`). `ci.yml` here only calls it |
| change a file the blueprint renders | the blueprint, then `copier update` here |

## Rules

- Client-facing text in `pt-PT`, with the `en` version kept in sync (the site is bilingual).
  Code, commits and notes in English.
- CI is truth: never run build, lint, typecheck, test, format or dev locally. Push, then read
  the `ci` run.
- Secrets never in git: names only, values in GitHub or Vercel settings.
- `main` changes by PR. The merge is a human's.
