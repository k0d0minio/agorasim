# Project rules — what is true of THIS repo (Layer 3 reference, project-owned)

The stage and lane contracts under `stages/` and `lanes/` are template-owned: byte-identical in
every pipeline repo, and carrying no repo's identity. Everything that is specific to this repo
lives in two project-owned files the sync never touches — `.icm/project.json` for the values a
script reads (name, docs path, archive paths, required checks and variables) and **this file**
for the rules a stage reads. A contract that says "see `_shared/project-rules.md`" means: the
answer is here, and it is this repo's own.

Fill each section in; a section that genuinely does not apply says so in one line.

## People and gates

- **The operator** — the human who ticks **Spec approved** and **Ready to merge**, and merges
  every PR from GitHub: <name>.
- **Authors** — where a story or request comes from (`run.md` → `author/source:`): <names,
  roles, or "the operator themselves">.

## Knowledge

- **Docs tree** — `docs_path` in `.icm/project.json`; the stages read it through
  `_shared/knowledge-map.md` (project-owned — it names this repo's pages). <Or: this repo has no
  docs tree; the map is empty and the knowledge lane is unused.>
- **Code rules** — `<path>` (the file `_shared/conventions.md` redirects to).

## The factory

- **Required CI checks** — `required_checks` in `.icm/project.json` (the names `ci-status.sh`
  waits for). Tiering, if any (which checks run on a draft head, which on a ready one): <…>.
- **Local feedback scripts** — `scripts/format.sh` and `scripts/lint.sh` run <formatter / linter>
  over changed files only; CI stays the verdict. <Or: not wired — the stubs report SKIP.>
- **Archive** — `runs_archive` / `intake_archive` in `.icm/project.json`. <Where they are served
  from, if anywhere; the default `_done/` folders need no note.>

## Announcing

- **Post-merge notification** — `scripts/notify.sh` <is wired to …> / <is not wired; a CI
  workflow on the merge announces instead: `.github/workflows/<name>`>.
- **Changelog** — <where a user-visible change is written up, and the skill or convention that
  owns its shape; or "none">.

## Capability skills the stages may call

<The one-job skills under `.claude/skills/` a stage names — e.g. a docs skill for the
knowledge lane, a smoke-test skill for Release. "None" is a fine answer; the contracts say what to
do when a named skill is absent.>
