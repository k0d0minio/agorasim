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

- **The verdict** — the `Vercel` status (`deploy.projects[].status_context`; `_shared/ci.md`
  → the cost floor, D43). `required_checks` in `.icm/project.json` is **empty**. Private on
  GitHub Free: no ruleset exists, so nothing is required by GitHub — the stage contracts and
  `ci-status.sh` are the gate.
- **The advisory quality job** — `Quality (advisory)` in `.github/workflows/ci.yml`: ESLint ·
  `tsc --noEmit` · the vitest suite, inside `web/`, as steps of one job, on a **ready** head
  only (`ready_for_review` / `synchronize` / `reopened` with a job-level draft guard),
  path-filtered out of `.icm/**`, markdown and `.github/**`, never on `main`, **no `next
  build`** (Vercel's is the build — it ran here until 2026-09-24, without a `DATABASE_URL`).
  Reported by `ci-status.sh`, never required: a red run is a finding the stage fixes on the
  branch. **A draft head owes CI nothing** — `lint.sh` before every push and
  `security-check.sh` before every commit are the pre-flip check. The full sweep stays blocked
  in-session by the estate's `block-local-checks.sh` hook and `opencode.jsonc`. There is no
  Husky, no lint-staged and **no formatter** in this repo.
- **Every other workflow, and what each costs:**

  | Workflow       | Trigger                                                                                                                                                       | Why it is CI                                                                                                                                                                                                                     |
  | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `DB migrate`   | called by `Release` on a published Release; push to `main` touching `web/drizzle/**`, `web/src/db/**` or `drizzle.config.ts` (its own gate decides); dispatch | Applies the Drizzle journal to production Neon from the `DATABASE_URL` secret, verifies every entry (`web/scripts/verify-migrations.ts`), seeds the first owner. **Never on a PR** — a preview's database is its own Neon branch. |
  | `Neon cleanup` | PR closed                                                                                                                                                     | Deletes `preview/<branch>` and `run/<slug>` — needs the Neon API key.                                                                                                                                                            |
  | `Release`      | Release published; PR merged                                                                                                                                  | Migrates, promotes the staged deployment, announces (D39).                                                                                                                                                                       |

  Retired 2026-09-24 (D43): `Pipeline` and `Gates` — 105 and 129 runs in a month, a billed
  minute each for seconds of work. Build and Release run `project-labels.sh` themselves; the
  validations run before the gate as they always did; the stage reads the checkbox from the PR
  body, and nothing needed the projection. `Vercel Preview Comments` is noise (`_shared/ci.md`).
  There is no smoke check — the walk is the operator's, at Ready-to-merge, on the preview URL
  the `Vercel` status carries.
- **Local feedback scripts** — `.icm/scripts/lint.sh` runs the repo's own ESLint (the
  `eslint.config.mjs` in `web/`, `eslint-config-next`) over the `web/` files the branch changed,
  no `--fix`; an error is `RESULT: PROBLEMS`, a warning is reported and passes — the same bar
  `ci.yml`'s `pnpm lint` applies. `.icm/scripts/format.sh` reports `SKIP`: **this repo runs no
  formatter**, by choice, so there is nothing to wire and nothing that could re-drift a
  template-owned file on commit. Feedback before a push, never the verdict — the deploy is the
  verdict (estate decisions D21, D43).
- **The security gate** — `.icm/scripts/security-check.sh` runs before every commit in Build and
  before every lane's push (template-owned; the one local check that is a gate). Not wired as a
  git pre-commit hook — there is no Husky here, by choice — so the stages call it. gitleaks is
  not installed on Jamie's machine; the built-in patterns are the floor. `security.audit_command`
  is empty: the pnpm lockfile is audited automatically.
- **The run's database** — `database.isolation: neon` in `.icm/project.json` (decided
  2026-09-23, the day the template gained the engine — estate decision D32): every run gets a
  Neon branch of its own, `run/<slug>`, made at `db-branch.sh <slug> up` with a 7-day expiry —
  since the D41 sync (2026-09-24) a child of the UAT database in `uat-agorasim`, never a copy of
  production (`database.neon.nonprod_project_id`; the D32 shape made it a child of production's
  `main`), through the key `NEON_API_KEY` names in the shell
  (`database.neon.api_key_env`; the value is never in git). No psql and no docker on Jamie's
  machine, which is why `schema` and `container` were not chosen. Until the key is exported,
  `db-branch.sh` answers SKIP and a session runs no migration locally — the preview applies it.
- **The environments' databases** — two Vercel Marketplace (Neon) databases since the
  2026-09-24 cutover (estate decision D41). **Production**: Neon project `nameless-sea-98952497`
  (store `agorasim`; `database.neon` in `.icm/project.json`), its `main` branch — **not yet
  protected** (Jamie's, in the Neon Console) — connected to the **Production** environment only,
  preview branching off. **UAT and previews**: the second database `uat-agorasim` (Neon project
  `lingering-frog-97017403`, Postgres 18 — production is 17; kept apart on purpose, Jamie
  2026-09-24: Drizzle's plain SQL runs on both, and Neon has no in-place major upgrade), connected
  to the `uat` environment, Preview and Development with preview branching on: UAT reads its
  default branch, a PR preview gets `preview/<git-branch>` inside it.
  Nothing non-production is wired to production's project, and no database variable is set by
  hand — every one is the integration's. The UAT database starts empty and is built by the
  migrations the UAT build runs (the catalogue seeds are migrations); it holds no copy of
  production's data, so its first owner account is seeded by hand (`pnpm db:seed-owner` against
  it). `.icm/project.json` declares both: `database.neon.project_id` is production's,
  `database.neon.nonprod_project_id` the UAT database's — so `db-branch.sh` cuts runs, `db-env.sh`
  lists UAT, previews and runs, and `neon-cleanup.yaml` deletes a closed PR's `preview/*` and
  `run/*`, all in `uat-agorasim`, and no pipeline script writes production's project (icm-board
  D41, stub 5, synced 2026-09-24). `database.neon.reset_command` is empty — this repo has no
  script that empties the UAT database, so `db-env.sh reset-uat` answers SKIP; to rebuild it,
  recreate the branch and let the next UAT build re-migrate. Migrations reach previews and UAT **at build**:
  `web/scripts/vercel-build.sh`, the `vercel-build` script Vercel runs in place of `build`, applies the Drizzle journal to the
  deployment's own branch and verifies it (`pnpm db:migrate && pnpm db:verify`, over
  `DATABASE_URL_UNPOOLED`) before `next build` — only when `VERCEL_ENV` is `preview`; production,
  and a build where `VERCEL_ENV` is not exposed, build without migrating, and `db-migrate.yml`
  stays the one production migrator (chore `vercel-build-migrates-previews`, 2026-09-23).
  Inside the `uat` custom environment `VERCEL_ENV` is `preview`, so the UAT build migrates the UAT
  database exactly like a preview; `db-migrate.yml` migrates production only when release.yaml
  calls it on a published promotion Release (its `gate` skips the push to `main`, D39 (5)).
  CI's `pnpm build` is untouched. `NEON_API_KEY` (one key reaching both projects) is in the
  Actions secrets and exported on Jamie's machine. The stray branch `verify-0026-quote-flow-message-kinds` (a console
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
- **The labels** — the session projects them (D43; no workflow does): `new-run.sh` at Define,
  `project-labels.sh <slug> --stage auto` in Build after the first push that carries `notes.md`,
  `--stage release` at Release's step 1. The script derives `stage:*` from which outputs exist
  and PUTs the full set; a run's PR is the one `run.md` points at.
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
  `## Release` record and writes no page; Release's own completeness check reads the record for exactly that (the `pipeline.yaml` step that did so was retired by D43). The phone guide that once carried admin-screen changes
  (web/docs/guia-telemovel.md) was deleted in `6cbf0d4` and has no replacement — a changed admin
  screen currently has no page kept current for it. Bug and tweak lanes likewise write no page.
- **Workflows** — the reference `release.yaml` since the 2026-09-24 cutover (D39): on a UAT repo
  it is the promotion (stage → migrate → promote → announce on `release: published`) and a merged
  PR announces nothing, so nothing announces twice; `db-migrate.yml` takes the reference shape
  (the `gate` job, `workflow_call`), its own pnpm steps and owner seed kept. `ci.yml` is this
  repo's own advisory job (§ The factory). `pipeline.yaml` and `gates.yaml` were retired on
  2026-09-24 (D43) and the reference `labels.yaml` with them.
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

<!-- Retrospective Learned Rule [2026-09-24] -->
- In web/.env.example, end a new key's comment block with an explicit `# [production,preview,development]` (or its real targets) line — env.sh audit loses the note of a key with no targets suffix until the template is fixed. (`warn] email_opt_out_secret: no note yet (# todo: note) — one sentence `, seen 1× — thankyou-review-email; web, web/drizzle, web/src)
<!-- Retrospective Learned Rule [2026-09-24] -->
- A column on `bookings` that describes one departure (like `no_show_at`) must be reset in `web/src/lib/booking-move.ts`'s update — a move changes the departure under it. (`FAILURE.md` — thankyou-review-email)
<!-- Retrospective Learned Rule [2026-09-24] -->
- Size a public endpoint's throttle for who actually calls it: a mail provider's one-click POST, a webhook sender or a crawler is not one guest on one IP. (`FAILURE.md` — thankyou-review-email)
<!-- Retrospective Learned Rule [2026-09-24] -->
- An admin dialog that closes on `useActionState`'s `state.ok` stays closed for good unless its component is keyed on the row value the action changes — key it, or derive `open` from a fresh state (as `ConfirmedQuoteAction` does), whenever the action leaves its trigger on screen. (`FAILURE.md` — quote-refunds)
<!-- Retrospective Learned Rule [2026-09-24] -->
- In a cloud session, run `git remote set-head origin main` before `/security-review` — it diffs against `origin/HEAD`, which a fresh clone lacks. (`FAILURE.md` — quote-refunds)
<!-- Retrospective Learned Rule [2026-09-24] -->
- `new-run.sh` and `close-out.sh` scope their own `git add` to `.icm/runs/$slug/` only — a lane's actual code fix is never picked up by either script and must be staged and committed with explicit paths (never `git add -A`) by the session itself. Verify with `git show --stat <the run-pointers commit>` before pushing: it should carry only `.icm/runs/**`, not the source files. (`FAILURE.md` — fix-move-back-suppresses-reminder)
<!-- Retrospective Learned Rule [2026-09-24] -->
- In a vitest file that mocks `@/db` (or a module that feeds it), keep every value-level import of an app module dynamic — `await import(...)` placed after the `vi.mock` calls and their captured `const`s — never a static `import { x } from "@/lib/y"` at the top: a static import that transitively reaches a mocked module resolves before the file's own top-level `const`s initialise and throws "Cannot access '…' before initialization" (`ReferenceError`, vitest hoisting). Type-only imports (`import type { … }`) are unaffected and can stay static. (`FAILURE.md` — fix-move-back-suppresses-reminder; web/src/lib/booking-move.test.ts)
<!-- Retrospective Learned Rule [2026-09-25] -->
- When a Drizzle journal conflicts with `main` at merge, keep every entry `main` already has at its index and stamp, and put this branch's migration last with a `when` newer than all of them — never renumber a merged migration, since UAT applies each merge at build and skips anything stamped before its newest applied row. (`FAILURE.md` — fix-uat-migration-ordering)
<!-- Retrospective Learned Rule [2026-09-25] -->
- In a cloud session, call `unsubscribe_pr_activity` on the PR as soon as `new-run.sh` opens it — the harness subscribes new PRs by default and this repo subscribes none. (`FAILURE.md` — notifications-page-real)
<!-- Retrospective Learned Rule [2026-09-25] -->
- A scheduled email whose making has a side effect (minting a link, rotating a token) must take its message-log claim first — pass a `ClaimedMessage` builder to `sendLoggedEmail`, never a prebuilt message — and must write the email before it retires the old value. (`FAILURE.md` — balance-scheduler)
