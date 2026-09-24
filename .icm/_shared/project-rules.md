# Project rules — what is true of THIS repo (Layer 3 reference, project-owned)

The stage and lane contracts under `stages/` and `lanes/`, the shared doctrine in `_shared/`
(`github`, `ci`, `stage-preamble`, `scope-template`, `conventions`), `intake/CONTEXT.md` and the
factory scripts are **template-owned**: byte-identical in every pipeline repo in the estate,
synced from `icm-board/_system/template/icm-pipeline/` by `icm-sync.sh`, and carrying no repo's
identity. Everything specific to Agorasim lives in the project-owned files the sync never touches —
`.icm/project.json` for the values a script reads, `_shared/knowledge-map.md` for the doc pages,
`scripts/{format,lint,validate-knowledge-map,report}.sh` for this repo's own hooks,
`runs/README.md`, and **this file** for the rules a stage reads. A contract that says "see
`_shared/project-rules.md`" means: the answer is here, and it is ours. (Estate decision D20,
2026-09-18; this repo adopted the pipeline the same day and was brought up to the D31 template on
2026-09-23 — `.icm/template-version` names the icm-board commit.)

## People and gates

- **The operator** — Jamie: ticks **Spec approved** and **Ready to merge**, smoke-tests the
  preview by hand before the second tick, and merges every PR from GitHub — spine and lane alike.
  Those two checkboxes are the only binding approvals in the pipeline; the client's involvement
  is the scope (settled at Scope) and the UAT sign-off (below) — never a gate on a PR.
- **Authors** — where a story or request comes from (`run.md` → `author/source:`): Diogo & Rita,
  the client — in person at the Friday meetings, by phone or WhatsApp, or through their own
  documents under `.icm/docs/` (the accepted proposal, the process guide, the commission
  agreement); and Jamie himself for estate, ops and gifted work. Scope settles the source with the
  operator in session; nothing is answered out of band — a question only the client can answer
  goes to the deal folder's question pack in icm-board, never into a spec as an assumption.
  Vocabulary: the site is bilingual PT/EN and the admin is Portuguese-only (register decision D4);
  the admin's one-word-per-thing glossary is `.icm/docs/admin-pt-inventory.md`; everything the
  pipeline writes is English.
- **UAT sign-off** — `uat` in `.icm/project.json` (declared 2026-09-23; one branch since the
  2026-09-24 cutover, D39): the Vercel custom environment `uat` on the `agorasim` project,
  branch-tracking `main`, at the one fixed address **https://uat.agorasim.pt**. Every merge to
  `main` — spine, lane, hotfix, knowledge — deploys there, and builds a production deployment that
  stays **Staged** (Auto-assign Custom Production Domains is off): production moves only on a
  promotion. The batch is what has merged since the last published promotion Release
  (`git log <last release>..origin/main`; `promote.sh status`). Diogo & Rita test the batch at
  that address — on the `uat` environment's own variables (the sandbox Stripe keys, the UAT
  database below) — and say yes the way the relationship works (the Friday meeting, a call,
  WhatsApp). Jamie records it: `.icm/scripts/promote.sh approve --by "Diogo"` (or Rita) drafts the
  promotion Release; Jamie publishes it on GitHub, and `.github/workflows/release.yaml` migrates
  production, promotes the staged build of that SHA and announces. No script publishes, and no
  message, PR comment or silence is ever read as an approval (`_shared/promotion.md`). The host is
  under the client's `agorasim.pt` zone (Jamie's choice at the cutover, over the earlier
  `uat.agorasim.jamienisbet.com`): it resolves only once a `CNAME uat → cname.vercel-dns.com`
  exists at the zone's registrar (amenworld) — theirs to add, owed at the cutover. The branch
  alias is no substitute: the project's SSO protection covers every non-custom domain.
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
- **The security gate** — `.icm/scripts/security-check.sh` runs before every commit in Build and
  before every lane's push (template-owned; the one local check that is a gate). Not wired as a
  git pre-commit hook — there is no Husky here, by choice — so the stages call it. gitleaks is
  not installed on Jamie's machine; the built-in patterns are the floor. `security.audit_command`
  is empty: the pnpm lockfile is audited automatically.
- **The run's database** — `database.isolation: neon` in `.icm/project.json` (decided
  2026-09-23, the day the template gained the engine — estate decision D32): every run gets a
  Neon branch of its own, `run/<slug>`, a copy of production made at `db-branch.sh <slug> up`
  with a 7-day expiry, through the key `NEON_API_KEY` names in the shell
  (`database.neon.api_key_env`; the value is never in git). No psql and no docker on Jamie's
  machine, which is why `schema` and `container` were not chosen. Until the key is exported,
  `db-branch.sh` answers SKIP and a session runs no migration locally — the preview applies it.
- **The environments' databases** — two Vercel Marketplace (Neon) databases since the
  2026-09-24 cutover (estate decision D41). **Production**: Neon project `nameless-sea-98952497`
  (store `agorasim`; `database.neon` in `.icm/project.json`), its `main` branch — **not yet
  protected** (Jamie's, in the Neon Console) — connected to the **Production** environment only,
  preview branching off. **UAT and previews**: the second database `uat-agorasim` (Neon project
  `lingering-frog-97017403`, Postgres 18 — production is 17; kept apart on purpose, Jamie 2026-09-24:
  Drizzle's plain SQL runs on both, and Neon has no in-place major upgrade), connected to the `uat` environment, Preview and Development with preview
  branching on: UAT reads its default branch, a PR preview gets `preview/<git-branch>` inside it.
  Nothing non-production is wired to production's project, and no database variable is set by
  hand — every one is the integration's. The UAT database starts empty and is built by the
  migrations the UAT build runs (the catalogue seeds are migrations); it holds no copy of
  production's data, so its first owner account is seeded by hand (`pnpm db:seed-owner` against
  it). `database.neon.uat_branch` still reads `"uat"` because the template's schema requires a name
  with UAT declared — it names no branch in production's project, and the template learns the
  second project in `one-branch-two-targets/uat-database-resource` (icm-board). Until then
  `db-branch.sh` runs and `neon-cleanup.yaml` still look in production's project (run branches are
  cut there; a PR's `preview/*` in `uat-agorasim` is deleted by hand), and `db-env.sh reset-uat`
  has no parent to reset from — re-migrate instead. Migrations reach previews and UAT **at build**:
  `web/scripts/vercel-build.sh`, the `vercel-build` script Vercel runs in place of `build`, applies the Drizzle journal to the
  deployment's own branch and verifies it (`pnpm db:migrate && pnpm db:verify`, over
  `DATABASE_URL_UNPOOLED`) before `next build` — only when `VERCEL_ENV` is `preview`; production,
  and a build where `VERCEL_ENV` is not exposed, build without migrating, and `db-migrate.yml`
  stays the one production migrator (chore `vercel-build-migrates-previews`, 2026-09-23).
  Inside the `uat` custom environment `VERCEL_ENV` is `preview`, so the UAT build migrates the UAT
  database exactly like a preview; `db-migrate.yml` migrates production only when release.yaml
  calls it on a published promotion Release (its `gate` skips the push to `main`, D39 (5)).
  CI's `pnpm build` is untouched. `.github/workflows/neon-cleanup.yaml` deletes a PR's `run/*`
  branches on close (see above for `preview/*`); `NEON_API_KEY` is in the Actions secrets and
  exported on Jamie's machine. The stray branch `verify-0026-quote-flow-message-kinds` (a console
  verification copy from 2026-09-18) is not the pipeline's — Jamie's to delete. `db-env.sh status` reads the
  project.
- **Migrations** — `migrations` in `.icm/project.json`: `web/drizzle`, generated by
  `drizzle-kit generate` as `NNNN_<name>.sql` with `meta/_journal.json` as the order of record.
  That is neither stamp form `check-migrations.sh` reads, so it answers SKIP ("no stamped SQL
  migrations of this branch's own") and prints Drizzle's own ordering note; `out_of_order: false`
  because Drizzle applies the journal in sequence, and two runs that both generated a migration
  conflict in the journal at merge — resolved by regenerating on the merged tree, never by
  hand-editing `idx`. Forward-only (`reversible: false`): a code revert must tolerate the newer
  schema, and `rollback.sh` says so.
- **Health endpoint** — `health_endpoint` in `.icm/project.json`: `https://agorasim.pt/`, the
  home page, which answers 200 when production is up (`www.agorasim.pt` redirects to it; there
  is no `/api/health`). `health-check.sh` reads it once after a promotion; a run's
  merge into `main` reaches UAT and a Staged build only, and Release skips the read.
- **Deploy project (Vercel)** — one: project `agorasim` (team Kodominio), status context
  `Vercel`, root directory `web/`. **Previews build on every push, draft or ready** — there is no
  ignore step and no draft suppression, so the contracts' "drafts build no previews" is stricter
  than what happens: a draft head's preview simply exists earlier, and nothing depends on its
  absence. Every merge to `main` builds twice: a production deployment held **Staged**
  (Auto-assign off; promoted by `release.yaml`) and the `uat` custom environment's, at
  https://uat.agorasim.pt (People and gates → UAT sign-off). Environment scoping is the money
  rule: previews and `uat` carry the **sandbox** Stripe keys (set on `uat` by hand — a custom
  environment inherits nothing from Preview); live keys, the connected account id, the live webhook secret and
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
  pipeline's labels were created on GitHub from `.github/labels.yml` on 2026-09-23 (`gh label
  create`, in the template-sync PR); a new entry in that file is created the same way, once.

## Reporting

- **Kinds → channels** — `reporting` in `.icm/project.json`: `announce` → **github-release**
  (the seeded default: a GitHub Release tagged `release/<date>-<slug>` on the merge SHA, the
  summary as its name and body); `alert` → **none — the red CI job is the alert**, beside
  Vercel's own deployment-failed email and Sentry (`web/src/lib/observability.ts`, server-side,
  #95), all of which reach Jamie; `economics` → none (icm-board's `run-economics.sh` writes it
  into the deal folder). Slack and email keep their variable *names* in `project.json` and are
  mapped to no kind; `report.sh` prints SKIPPED for a mapped channel whose variable is unset.
- **Who calls the hook** — with UAT declared, a run's merge announces nothing: Release records
  `announce: deferred to promotion`, and `release.yaml`, on the published promotion Release, calls
  `report.sh announce --tag <that Release's tag>` once per batch — the github-release channel
  reuses the published Release, never a second one. (`reporting.announce_from` reads `ci`; on a UAT
  repo it changes nothing.) The client still
  hears about a change from Jamie, by WhatsApp or in person, as before — the Release is the
  record, not the conversation. (`scripts/notify.sh`, the earlier unwired stub, was retired by
  the 2026-09-23 sync; `report.sh` replaces it.)
- **Changelog** — **none.** Release records `announce: none` or `announce: internal` in its
  `## Release` record and writes no page; the release-completeness step in `pipeline.yaml` reads
  the record for exactly that. What the team needs to know about a changed admin screen goes into
  the phone guide (web/docs/guia-telemovel.md) as a docs update in the same PR — a page kept
  current, not a changelog. Bug and tweak lanes likewise write no page.
- **Workflows** — the reference `release.yaml` since the 2026-09-24 cutover (D39): on a UAT repo
  it is the promotion (stage → migrate → promote → announce on `release: published`) and a merged
  PR announces nothing, so nothing announces twice; `db-migrate.yml` takes the reference shape
  (the `gate` job, `workflow_call`), its own pnpm steps and owner seed kept. The reference
  `labels.yaml` is **absent**:
  `.github/workflows/pipeline.yaml` already carries the same `Project run labels` job plus the
  advisory checks (The factory, above), and `gates.yaml` is this repo's own addition.

## Capability skills the stages may call

- **Pipeline capability skills** — `.icm/skills/<name>/SKILL.md` (three-tier, loaded on a
  trigger; `.icm/skills/README.md`; the session-start hook prints the registry, `list-skills.sh
  --bare` on demand). Seeded and template-owned by the 2026-09-23 sync: `security-audit`,
  `database-migration`, `preview-deploy`. This repo's own additions: none.
- **Repo skills** — none. The contracts' fallbacks apply: Release and the knowledge lane edit
  `.icm/docs` pages as plain markdown under each page's own conventions (the runbook's
  human-checkbox rule — a session never ticks one; the data-protection register's processor
  table changes in the same PR as `web/src/content/privacy.ts`); Scope writes in the same
  register; there is no docs skill, no changelog skill and no router hook — `/pipeline` is
  explicit and the bare forms route through the skill's own description. The one repo-local
  script a stage may find useful outside the factory is `web/scripts/dns-snapshot.sh`
  (read-only, the runbook's zone diff); it is the go-live epic's, not a capability skill.

## Support

- **Tier** — `support.tier: none` in `.icm/project.json`: the engagement is in delivery and no
  after-handover line has been agreed yet — the handover lane records the one the deal settles
  (`.icm/lanes/handover/CONTEXT.md`). There is no fail-safe page in `web/` today; Sentry is wired
  server-side and its key is named `SENTRY_DSN` (`support.monitoring.sentry_dsn_env`), so moving
  to `basic` needs the page and the tier line only.

## Learned rules

*The constraints earlier runs paid for, appended before each close-out by two writers with one
shape: `.icm/scripts/retrospective.sh --apply` (at Release and at the end of every lane — one
line per error class a run fixed and flagged with `- rule:` in its `error.log`, or fixed again
after an earlier run already had, counted across the archive's `error.log`s) and
`.icm/scripts/run-pack.sh --sync-rules` (called by `close-out.sh` — the `## Learned rules` a run
wrote in its `FAILURE.md`: what no tool logged — a wrong assumption, a STOP, a skipped step).
Each line carries the run it was learned in. Build and the lanes read this section before their
first edit, with the same standing as the code rules. Edit or delete lines freely — this file is
the repo's own, never synced — and delete a line that reads as a slip rather than a constraint.*

<!-- Retrospective Learned Rule [2026-09-23] -->
- until triage/dependency-advisories-2026-09-23 is done, any change set touching web/package.json or the lockfile trips security-check.sh's audit on the 17 pre-existing advisories — park nothing new, re-run the gate with --no-audit, and never widen the PR to bump dependencies (`scope=staged head=nenden branch= — blocked n (redacted trace; the secr`, seen 2× — vercel-build-migrates-previews; web, web/scripts)
<!-- Retrospective Learned Rule [2026-09-23] -->
- The repo-wide rule from this run is in `error.log` and was promoted by `retrospective.sh --apply`; nothing further here. (`FAILURE.md` — vercel-build-migrates-previews)

<!-- Retrospective Learned Rule [2026-09-23] -->
- `security-check.sh --branch` blocks every lane on the dependency audit of the lockfile `main`
  carries (17 high/critical advisories, two critical in `next@16.2.12`) until
  `intake/triage/next-rce-advisories.md` ships; a lane whose diff touches no manifest parks nothing
  new, points at that stub in its `error.log` `- resolved:` line and re-runs the gate with
  `--no-audit` — never bumps a dependency inside an unrelated PR. (learned in go-live-session-stubs)
