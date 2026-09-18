# Project rules — what is true of THIS repo (Layer 3 reference, project-owned)

The stage and lane contracts under `stages/` and `lanes/`, the shared doctrine in `_shared/`
(`github`, `ci`, `stage-preamble`, `scope-template`, `conventions`), `intake/CONTEXT.md` and the
factory scripts are **template-owned**: byte-identical in every pipeline repo in the estate,
synced from `icm-board/_system/template/icm-pipeline/` by `icm-sync.sh`, and carrying no repo's
identity. Everything specific to Agorasim lives in the project-owned files the sync never touches —
`.icm/project.json` for the values a script reads, `_shared/knowledge-map.md` for the doc pages,
`scripts/{format,lint,validate-knowledge-map,notify}.sh` for this repo's own hooks,
`runs/README.md`, and **this file** for the rules a stage reads. A contract that says "see
`_shared/project-rules.md`" means: the answer is here, and it is ours. (Estate decision D20,
2026-09-18; this repo adopted the profile the same day.)

## People and gates

- **The operator** — Jamie: ticks **Spec approved** and **Ready to merge**, smoke-tests the
  preview by hand before the second tick, and merges every PR from GitHub — spine and lane alike.
  Those two checkboxes are the only binding approvals in the system; the client's involvement
  ends when the scope is settled at Scope.
- **Authors** — where a story or request comes from (`run.md` → `author/source:`): Diogo & Rita,
  the client — in person at the Friday meetings, by phone or WhatsApp, or through their own
  documents under `.icm/docs/` (the accepted proposal, the process guide, the commission
  agreement); and Jamie himself for estate, ops and gifted work. Scope settles the source with the
  operator in session; nothing is answered out of band — a question only the client can answer
  goes to the deal folder's question pack in icm-board, never into a spec as an assumption.
  Vocabulary: the site is bilingual PT/EN and the admin is Portuguese-only (register decision D4);
  the admin's one-word-per-thing glossary is `.icm/docs/admin-pt-inventory.md`; everything the
  pipeline writes is English.
- **The front pushes straight to `main`.** There is **no ruleset and no branch protection**: the
  repo is private on the GitHub free plan, where both are unavailable (the API answers 403). Anyone
  with write access pushes to `main`, and the merge settings allow merge, squash and rebase.
  Verified by history: the owner's identity (`Jamie Nisbet <jamie.nisbet@outlook.be>`, `2aa65ee`,
  `b524237`) and a Claude session's (`Claude <noreply@anthropic.com>`, `02dc6a0`, `cdb3954`) have
  both landed directly on `main`. Consequence: the required check gates nothing mechanically —
  `ci-status.sh` `GREEN` is the factory's verdict and the operator's merge is the discipline. The
  launch runbook's Track H step "protect `main`, require the CI check" needs GitHub Pro or a public
  repo, and the repo is private on purpose (D15) — that is a decision for Jamie, not a stage.
- **The GitHub repo** is `k0d0minio/agorasim`, and it is **private** — it carries the client's
  documents. The scripts derive it from `origin`; a remote session's GitHub connection provides
  the credential (`GH_TOKEN`), a local session a logged-in `gh`. Never a credential, token or
  identity document in `.icm/` — "in the password manager" is the only allowed form, and the
  runbook says so in its own header.

## Knowledge

- **Docs tree** — `.icm/docs` (`docs_path` in `.icm/project.json`): the client's own documents
  (the proposal, the process guide, the commission agreement — PDFs, read with `pdftotext` when a
  stage needs their words), the launch runbook, the data-protection register and the admin
  Portuguese glossary; the stages read them through `_shared/knowledge-map.md`. The **direction
  of record** is the register, `.icm/project.md` — what the project is for, its business rules,
  its decisions (`D1…`) — written by `/project` in icm-board, never by a stage; where a docs page
  and the register disagree, the register wins and the page is the thing to fix (`knowledge
  edit`). Three pages of product knowledge live **outside** the tree and are named in the map in
  prose: the facts of record (prices, cars, capacity, contacts) in workspaces/_config/business-facts.md,
  the admin's design rules in web/docs/admin-mobile-design-spec.md, and the client's phone guide
  in web/docs/guia-telemovel.md. Release keeps all of them current when a change makes one stale.
- **Code rules** — `/AGENTS.md` § Conventions (ISR not SSG; `Localized<T>` content with PT and EN
  in sync; GEO first-class — JSON-LD, canonical, hreflang on every page; configure the factory,
  not the product) plus `web/AGENTS.md` (Next.js 16: read `node_modules/next/dist/docs/` before
  writing). Build loads them directly; `_shared/conventions.md` redirects there. A new environment
  variable is documented in `web/.env.example` (names and purposes only) in the same PR — that is
  what Release's deploy-breaking-config hold reads against.
- **Personas** — `guest`, `team`, `operator`: the `personas` array in `.icm/project.json` and
  the `persona:*` labels in `.github/labels.yml`. **guest** is the tourist — books, enquires,
  pays, cancels, reads the emails, PT or EN, on a phone; **team** is Diogo & Rita in the admin,
  Rita phone-first, everything in Portuguese; **operator** is Jamie — the estate, the Stripe
  platform account, Vercel, DNS. A spec's `- personas:` line names at least one.

## The factory

- **Required CI check** — `Lint, typecheck, test, build` (`required_checks` in
  `.icm/project.json`; the name contains commas, which is why the list is an array and
  `PIPELINE_REQUIRED_CHECKS`, when used as an override, is newline-separated). The workflow is
  `CI` (`.github/workflows/ci.yml`); the **check run** is named after its one job. It runs on
  every PR and on `main`, inside `web/`, with no path filter and **no tiering**: a draft head and
  a ready head run the same whole job — ESLint, `tsc --noEmit`, the vitest suite, `next build`
  without a `DATABASE_URL` (the public pages fall back to the shipped catalogue) — so here the
  "cheap tier" and the "full gate" the contracts distinguish are one and the same verdict, and
  `ci-status.sh` names the tier by the PR's draft state alone. The full sweep is blocked in-session
  by the estate's `block-local-checks.sh` hook and `opencode.jsonc`. There is no Husky, no
  lint-staged and **no formatter** in this repo.
- **The other check runs and statuses:**

  | Name                        | Class    | What it means                                                                                                                                                                                                                                                                                                                                                                             |
  | --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `migrate`                   | blocking | `DB migrate` (`.github/workflows/db-migrate.yml`) — runs on `main` only, on pushes touching `web/drizzle/**`, `web/src/db/**` or `drizzle.config.ts`, and by hand: applies the Drizzle journal to Neon, verifies every entry applied (`web/scripts/verify-migrations.ts`), seeds the first owner if configured. **Never present on a PR** — a migration reaches the database only after the merge, so a PR that adds one is smoke-tested on a preview whose database does not yet carry it. Read its verdict on the merge commit. |
  | `Project run labels`        | blocking | `Pipeline` (`.github/workflows/pipeline.yaml`) — one job: projects `stage:*` / `type:*` / `persona:*` / `complexity:*` from the run's outputs, then re-validates spec structure, intake bookkeeping, release completeness and the knowledge map as **advisory steps** — summary lines and `::warning::`s; only a label-projection fault can red it.                                                                                                     |
  | `Pipeline gates (advisory)` | advisory | `Gates` (`.github/workflows/gates.yaml`) — reads the two gate anchors in the PR body and is red while a present gate is unticked. A visible signal for the human, not a factory verdict: the stage contracts read the checkbox itself, and nothing requires this check. Advisory by name, so `ci-status.sh` never reds on it.                                                                                                                               |
  | `Vercel`                    | blocking | the one deploy project's commit status (below).                                                                                                                                                                                                                                                                                                                                           |

  `Vercel Preview Comments` is noise (`_shared/ci.md`). There is no smoke check (`smoke_check` is
  absent from `.icm/project.json`) — the operator's smoke is by hand, on the preview URL the
  `Vercel` status carries.

- **Local feedback scripts** — `.icm/scripts/lint.sh` runs the repo's own ESLint (the
  `eslint.config.mjs` in `web/`, `eslint-config-next`) over the `web/` files the branch changed,
  no `--fix`; an error is `RESULT: PROBLEMS`, a warning is reported and passes — the same bar
  `ci.yml`'s `pnpm lint` applies. `.icm/scripts/format.sh` reports `SKIP`: **this repo runs no
  formatter**, by choice, so there is nothing to wire and nothing that could re-drift a
  template-owned file on commit. Feedback before a push, never the verdict — CI's
  `Lint, typecheck, test, build` is the verdict (estate decision D21).
- **Deploy project (Vercel)** — one: project `agorasim` (team Kodominio), status context
  `Vercel`, root directory `web/`. **Previews build on every push, draft or ready** — there is no
  ignore step and no draft suppression, so the contracts' "drafts build no previews" is stricter
  than what happens: a draft head's preview simply exists earlier, and nothing depends on its
  absence. Production deploys from `main`. Environment scoping is the money rule: previews carry
  the **sandbox** Stripe keys; live keys, the connected account id, the live webhook secret and
  the live sender go into **Production only**, set by hand at go-live (`.icm/docs/launch-runbook.md`
  § Track G) — never a `sk_test_` key on the live domain, never a live key on a preview. The three
  crons in `web/vercel.json` (retention Mondays 03:00, dispatch daily 06:00, backup daily 02:30)
  fire on Production only.
- **Archive** — the estate defaults: `runs_archive` = `.icm/runs/_done`, `intake_archive` =
  `.icm/intake/_done` (both in `.icm/project.json`). Nothing serves them; git is the record. The
  intake tree was purged whole on 2026-09-11 (`git log -- .icm/intake` holds what went before);
  `intake/_done/` starts empty from the adoption.
- **The labels job** — `pipeline.yaml` re-projects labels on every push touching `.icm/runs/**`
  and derives `stage:*` from which outputs exist, which is why the contracts tell stages to
  commit their output rather than call `project-labels.sh` (Release excepted — it projects its
  own label at step 1). The job diffs `origin/$BASE_REF...$HEAD_SHA` — the PR's own files, never
  what `main` did in the meantime — and labels only a run whose `run.md` points at this PR. The
  pipeline's labels do not exist on the repo yet: create them once from `.github/labels.yml`
  (`gh label create`), or let the API create each on first apply.

## Announcing

- **Post-merge notification** — `scripts/notify.sh` is **not wired**, by decision (Jamie,
  2026-09-18): the client hears about a change from Jamie, by WhatsApp or in person, as for the
  hundred PRs before the pipeline. The script stays the template's stub — it prints the one-line
  summary Release hands it and exits 0 with `RESULT: SENT`; read that as *written, and told by
  hand*. No CI workflow announces. The only alert channel is Sentry (`web/src/lib/observability.ts`,
  server-side, #95), which reaches Jamie's inbox; nothing verifies the archive after the merge —
  the close-out riding the PR is the whole guarantee.
- **Changelog** — **none.** Release records `announce: none` or `announce: internal` in its
  `## Release` record and writes no page; the release-completeness step in `pipeline.yaml` reads
  the record for exactly that. What the team needs to know about a changed admin screen goes into
  the phone guide (web/docs/guia-telemovel.md) as a docs update in the same PR — a page kept
  current, not a changelog. Bug and tweak lanes likewise write no page.

## Capability skills the stages may call

None. The contracts' fallbacks apply: Release and the knowledge lane edit `.icm/docs` pages as
plain markdown under each page's own conventions (the runbook's human-checkbox rule — a session
never ticks one; the data-protection register's processor table changes in the same PR as
`web/src/content/privacy.ts`); Scope writes in the same register; there is no docs skill, no
changelog skill and no router hook — `/pipeline` is explicit and the bare forms route through the
skill's own description. The one repo-local script a stage may find useful outside the factory
is `web/scripts/dns-snapshot.sh` (read-only, the runbook's zone diff); it is the go-live epic's,
not a capability skill.
