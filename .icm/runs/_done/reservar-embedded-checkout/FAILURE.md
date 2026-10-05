# Failures: reservar-embedded-checkout

The run's retrospective — what cost a turn, and the rule that would have prevented it. Two
files share this job and split it cleanly: `error.log` (in the stage's `output/`) is the ledger
of errors a **tool** reported, written verbatim at the moment of the fix with its `- resolved:`
and `- rule:` lines, which `retrospective.sh` reads and counts across runs; **this file** is
what the run as a whole learned — a wrong assumption, a STOP, a skipped step, a gate that
blocked, a plan that had to be rewritten — which no tool ever logged. On close-out the
`## Learned rules` bullets below are copied into `_shared/project-rules.md` → Learned rules
(`run-pack.sh <slug> --sync-rules`, called by `close-out.sh`, the same shape as
`retrospective.sh --apply`), so the next run in this repo starts with them. Keep the rules
general; keep the retrospectives specific; never restate an `error.log` entry here.

## Retrospectives

### 2026-10-02 — the spec scoped the payment CSP to a route without saying how guests reach it

- what happened: Build found that a CSP served only on `/reservar` does nothing for a guest who arrives by a client-side `<Link>`: the document keeps the policy of the page it was first loaded on, which frames nothing, so Stripe's form would never load.
- why: a Content-Security-Policy belongs to the document, not to the URL; Define reasoned about paths only.
- fixed by: full-load links into `/reservar` plus a one-time reload backstop (D-9, 9e37290).

### 2026-10-02 — the latest @stripe/stripe-js did not match the server SDK's release

- what happened: `@stripe/stripe-js@10.0.0` (published the day before) loads Stripe's `endive` release while `stripe@22` and `API_VERSION` are `dahlia`.
- why: Stripe.js majors now track Stripe's named release trains; "latest" is not "compatible".
- fixed by: pinning `^9.17.0`, the `dahlia` line (D-11).

### 2026-10-02 — Release stopped on a key missing from Production

- what happened: `env.sh audit --changed` read `GAPS` at Release — `STRIPE_PUBLISHABLE_KEY` was on Preview but not Production.
- why: the operator act was named as "before the smoke" (Preview, `uat`), and Production was only named for go-live; the audit holds every declared target.
- fixed by: the operator adding it to Production; the release re-ran.

## Learned rules

- A security header scoped to some routes (`next.config.ts` `headers()` by `source`) only binds a document *loaded* on that route: spec how guests navigate in (full loads, or a reload guard) whenever a route-scoped CSP is what lets a page work.
- Pin `@stripe/stripe-js` to the major whose release train matches `API_VERSION` in `web/src/lib/stripe.ts` (read `RELEASE_TRAIN` in the package's `dist/pure.mjs`), never to the newest major.
- When a run adds an env key, name every Vercel target it is declared for — Production included — as an operator act in the Build stop report, not only the ones the preview smoke needs: Release's `env.sh audit --changed` holds all of them.
