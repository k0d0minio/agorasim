# Agorasim Toolkit — Layer 0 (repo identity & routing)

This repository is a **toolkit for operating the Agorasim business**, structured in two halves:

- **`web/`** — the product. A Next.js (App Router) + Tailwind + shadcn/ui site rebuilding
  agorasim.pt (currently serving at **agorasim.jamienisbet.com** until Diogo & Rita
  recover the domain). Bilingual PT/EN. This is the funnel destination; all marketing
  leads here. Booking runs through `/reservar` — availability calendar + Stripe Checkout
  with the Connect application fee, into the admin Sales board — on **sandbox keys** until
  the domain lands and the Production env flips (`.icm/intake/go-live/`,
  `.icm/docs/launch-runbook.md`). The enquiry form is the fallback path.
- **`workspaces/`** — the operations engine. ICM workspaces (*Interpretable Context
  Methodology*) that generate GEO/marketing content as reviewable markdown, then publish
  it into the website.

## The business
Guided **classic-car** countryside tours of the **Saloia** region (Sintra · Mafra · Ericeira),
Portugal. Signature experience **Rural Saloia** (~4h30); second tour **Óbidos & Medieval
Villages** (~5h); add-ons Tasco Galapito, Manzwine, Ramilo Wines. (Olaria MZ is retired —
do not reintroduce it.) Capacity is **2 drivers across 4 cars**, so at most two tours leave
at once, in two daily slots (10:00 / 14:00) shared by every route. Contacts:
Diogo +351 926 210 707 · Rita +351 919 272 077 · info@agorasim.pt.

## Where do I go?
- Changing the website (pages, design, content) → work in `web/` (`web/AGENTS.md` has Next.js
  notes; content lives in `web/src/content/`).
- Producing marketing / GEO content → open the relevant workspace under `workspaces/` and follow
  its `CONTEXT.md`. Reviewed output lands in `web/src/content/generated/`.
- Changing the code, in any way → **through the pipeline** (below). Picking the next stub, fixing
  a bug, changing a docs page: `/pipeline new`, `/pipeline bug "<report>"`,
  `/pipeline knowledge edit "<what>"` — the map is [`.icm/CONTEXT.md`](.icm/CONTEXT.md).
- What this project is *for*, its business rules, its decisions → the register,
  [`.icm/project.md`](.icm/project.md) — written by `/project agorasim` in icm-board, never by hand.

## Conventions
- **Rendering is ISR, not SSG.** Public pages are prerendered and revalidated hourly
  (`export const revalidate = 3600`) over the Neon catalogue, with the `web/src/content/`
  arrays as a build-time fallback so `next build` needs no `DATABASE_URL`; admin catalogue
  and calendar writes call `revalidatePath`, so an edit is live at once. Two exceptions:
  `/reservar/confirmacao` is `force-dynamic`, and every `/admin` route is dynamic. Because
  public HTML is written once and served from cache, nothing per-request belongs on a
  public page — per-guest content, or a per-request CSP nonce (see
  `web/src/lib/security-headers.ts`).
- The site is bilingual. Content is modelled as `Localized<T>` objects in
  `web/src/content/` — keep PT and EN in sync.
- GEO is a first-class concern: every page ships JSON-LD, canonical + hreflang, and answer-first
  copy. See `web/src/lib/jsonld.ts` and `web/src/lib/seo.ts`.
- ICM principle: **configure the factory, not the product.** Brand voice, facts and style live once
  in `workspaces/_config/`; each pipeline run produces a new deliverable using that configuration.

## How work ships

Through the pipeline, not ad hoc. The spine is **four stages — Scope → Define → Build →
Release**, the estate's standard set: the contracts under `.icm/stages/` are synced from
`_system/template/icm-pipeline/` in icm-board and carry no repo identity; what is true of this
repo is in [`.icm/_shared/project-rules.md`](.icm/_shared/project-rules.md) and
[`.icm/project.json`](.icm/project.json). A change to one of those contracts — or to the router, `/setup`, the
hooks — is a **template change request** ([`.icm/_shared/template-change.md`](.icm/_shared/template-change.md)):
a prompt for icm-board, parked as a triage stub, never an edit here; the sync brings it back.

| Stage       | What it owns                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Scope**   | record the source, settle it with the operator in session → `scope.md` (`D-n` decisions) → cut the intake batch. No PR. |
| **Define**  | stub → approvable `spec.md`; opens the run's one draft PR. Gate: **Spec approved**.                                    |
| **Build**   | implement exactly the spec; CI green; flip the PR ready. Gate: **Ready to merge**, after Jamie smokes the preview.     |
| **Release** | CI green on the full gate → review → docs → close-out on the branch → squash-merge into `uat`. The merge ends the run; production waits for the batch's promotion. |

`/pipeline scope <input>` for anything new; `/pipeline new` for the next stub; `/pipeline bug |
tweak | chore "<request>"` (or `<stub-name>` from `.icm/intake/triage/`) for the fast lanes;
`/pipeline hotfix "<what is wrong in production>"` when production is wrong now; `/pipeline
knowledge add|edit|remove "<what>"` to change a page under `.icm/docs/` outside a Release;
`/pipeline status` for the client's report; `/setup` to check the repo is complete, current and
configured. The bare forms route the same without the slash. Every stage has a human gate at its
boundary and the agent never crosses one on its own — and never ticks a box in
`.icm/docs/launch-runbook.md` either: those are Jamie's, Diogo's and Rita's.

**Two binding gates, both PR checkboxes, both Jamie's to tick.** **Spec approved** before Build;
**Ready to merge** before the squash-merge. There is no branch protection on `main` (private repo,
free plan), so `ci-status.sh` `GREEN` and the merge button are the whole discipline. CI is the
source of truth: never run `build`, `lint`, `typecheck` or `test` locally — `.icm/scripts/lint.sh`
gives changed-files feedback, nothing more.

**Every run reaches UAT first; production is a promotion.** This repo declares a persistent
client UAT environment (`uat` in `.icm/project.json`; the rule is `.icm/_shared/promotion.md`):
`main` is the only long-lived branch — run branches are cut from it and every PR targets it — and
each merge deploys to the Vercel custom environment `uat` while production holds a *Staged*
build. What has merged since the last published promotion Release is the batch Diogo & Rita test
at the one fixed address. When they say yes, Jamie records it — `/pipeline promote approve
"<who>"` drafts the promotion Release — and publishes it on GitHub; `release.yaml` migrates
production and promotes the staged build. No agent infers an approval and no script publishes. Who signs off and how is in `.icm/_shared/project-rules.md` → People and
gates.
