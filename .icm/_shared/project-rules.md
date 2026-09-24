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
- **UAT sign-off** — declared 2026-09-23 (`uat` in `.icm/project.json`): the long-lived branch is
  `uat` and the one fixed address is **https://uat.agorasim.jamienisbet.com** — a host on Jamie's
  Vercel-managed `jamienisbet.com` zone, assigned to the `uat` branch in the `agorasim` project.
  Not the branch alias, because the project's SSO protection covers every non-custom domain and
  the client could not open it; not a host under `agorasim.pt`, because that zone's DNS is at the
  client's registrar (amenworld) and a record there is theirs to make. Every run's PR — spine and
  lane — targets `uat`; a hotfix and a docs-only knowledge PR still target `main`. What has merged
  into `uat` since the last promotion is the batch (`.icm/uat/batch.json`, true on that branch).
  Diogo & Rita test the batch at that address — on the **Preview** environment's variables, so the
  sandbox Stripe keys and the preview database — and say yes the way the relationship works (the
  Friday meeting, a call, WhatsApp). Jamie records it: `.icm/scripts/promote-uat.sh approve --by
  "Diogo"` (or Rita), which opens the one promotion PR into `main`; Jamie merges it from GitHub
  and runs `promote-uat.sh sync`. No script merges, and no message, PR comment or silence is ever
  read as an approval (`.icm/uat/CONTEXT.md`). **One-time acts still owed** (`promote-uat.sh
  init` lists them): push the branch once — `git push origin main:uat`; add the host to the
  Vercel project's domains and assign it to branch `uat`; decide which data the client tests
  against (the Preview environment's `DATABASE_URL`, unless a custom environment is attached to
  the branch). Branch protection is unavailable on this plan (below), so `uat` is guarded exactly
  as `main` is — by `ci-status.sh` `GREEN` and the merge button.
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
  edit`). One page of product knowledge lives **outside** the tree and is named in the map in
  prose: the facts of record (prices, cars, capacity, contacts) in workspaces/_config/business-facts.md.
  Release keeps it current when a change makes it stale. The admin's design rules and the client's
  phone guide (formerly web/docs/admin-mobile-design-spec.md and web/docs/guia-telemovel.md) were
  deleted in `6cbf0d4` (2026-09-18, confirmed intentional) and no longer have a page of record.
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
- **The environments' databases** — Neon project `nameless-sea-98952497` (Kodominio, a
  Vercel-managed database; `database.neon` in `.icm/project.json`): production is the `main`
  branch — **not yet protected** (Jamie's, in the Neon Console). Previews are the Vercel
  integration's `preview/<git-branch>` (`neon.previews: vercel`; its Preview-branching toggle is
  **on** since 2026-09-23, so every deployment now gets a branch born from production — the
  previews built before that day read production's database). The UAT branch's database is
  `preview/uat`, created by the integration on the `uat` branch's first deployment, 2026-09-23.
  Migrations reach previews and UAT **at build**: `web/scripts/vercel-build.sh`, the
  `vercel-build` script Vercel runs in place of `build`, applies the Drizzle journal to the
  deployment's own branch and verifies it (`pnpm db:migrate && pnpm db:verify`, over
  `DATABASE_URL_UNPOOLED`) before `next build` — only when `VERCEL_ENV` is `preview`; production,
  and a build where `VERCEL_ENV` is not exposed, build without migrating, and `db-migrate.yml` on
  `main` stays the one production migrator (chore `vercel-build-migrates-previews`, 2026-09-23).
  CI's `pnpm build` is untouched. `.github/workflows/neon-cleanup.yaml` deletes a PR's `preview/*`
  and `run/*` branches on close; `NEON_API_KEY` is in the Actions secrets and exported on Jamie's
  machine. The stray branch `verify-0026-quote-flow-message-kinds` (a console verification copy
  from 2026-09-18) is not the pipeline's — Jamie's to delete. `db-env.sh status` reads the
  project; `db-env.sh reset-uat --apply` is the operator's reset after a promotion.
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
  is no `/api/health`). `health-check.sh` reads it once after a promotion merge into `main`;
  a run's merge into `uat` is not a production deploy and Release skips the read.
- **Deploy project (Vercel)** — one: project `agorasim` (team Kodominio), status context
  `Vercel`, root directory `web/`. **Previews build on every push, draft or ready** — there is no
  ignore step and no draft suppression, so the contracts' "drafts build no previews" is stricter
  than what happens: a draft head's preview simply exists earlier, and nothing depends on its
  absence. Production deploys from `main`; the `uat` branch deploys like any other branch and, once
  the host is assigned to it, answers at https://uat.agorasim.jamienisbet.com (People and gates →
  UAT sign-off). Environment scoping is the money rule: previews carry
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
- **Who calls the hook** — `announce_from: session`. On a repo without UAT that is Release step
  9; here every run merges into `uat`, Release records `announce: deferred to promotion`, and
  `promote-uat.sh sync` calls `report.sh announce` once per promoted batch. The client still
  hears about a change from Jamie, by WhatsApp or in person, as before — the Release is the
  record, not the conversation. (`scripts/notify.sh`, the earlier unwired stub, was retired by
  the 2026-09-23 sync; `report.sh` replaces it.)
- **Changelog** — **none.** Release records `announce: none` or `announce: internal` in its
  `## Release` record and writes no page; the release-completeness step in `pipeline.yaml` reads
  the record for exactly that. The phone guide that once carried admin-screen changes
  (web/docs/guia-telemovel.md) was deleted in `6cbf0d4` and has no replacement — a changed admin
  screen currently has no page kept current for it. Bug and tweak lanes likewise write no page.
- **Workflows** — the reference `release.yaml` is **absent** on purpose (`announce_from` is
  `session`; a workflow would announce twice) and the reference `labels.yaml` is **absent** too:
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
- The repo-wide rule from this run is in `error.log` and was promoted by `retrospective.sh --apply`; nothing further here. (`FAILURE.md` — vercel-build-migrates-previews)

<!-- Retrospective Learned Rule [2026-09-23] -->
- `next build` type-checks the `*.test.ts` files too (the Vercel preview fails on a test-only type error before the CI job reports), so a test helper's types matter as much as the app's. (`TS2749`, seen 1× — admin-quote-builder; web/drizzle, web/src)
<!-- Retrospective Learned Rule [2026-09-24] -->
- A page under `web/src/app/[locale]/` cannot answer with a 404 status after an `await`: the locale's `loading.tsx` streams it, so a real 404 needs the check in `web/src/proxy.ts` — spec it there or accept a `noindex` 200. (`FAILURE.md` — quote-page-and-deposit-link)
<!-- Retrospective Learned Rule [2026-09-24] -->
- A token stored as a digest (quote links, cancel links) can be put in a URL only by the code that minted it; never spec a later email, webhook or job that links back with it. (`FAILURE.md` — quote-page-and-deposit-link)
<!-- Retrospective Learned Rule [2026-09-24] -->
- When code reads a Stripe object to decide whether to mint a payable session, treat only `resource_missing` as "gone" and check a completed-but-unpaid session's payment intent — a delayed method can fail after `complete`. (`FAILURE.md` — quote-page-and-deposit-link)

<!-- Retrospective Learned Rule [2026-09-24] -->
- In web/src/lib/booking-emails.test.ts, assert copy containing an apostrophe, quote or ampersand against `message.text` literally and against `message.html` in its escapeHtml form (&#39; &quot; &amp;) — never loop both parts over one raw string. (`(empty)`, seen 1× — day-before-reminder; web/drizzle, web/src)
