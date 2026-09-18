# Lane — Chore (contract)

Invoked via `/pipeline chore "<task>"` — or `/pipeline chore <stub-name>` to start from a parked
finding in `.icm/intake/triage/` (the router resolves the name; the stub pre-seeds the task and
`new-run.sh --stub` moves it to `triage/_done/`). A fast lane for work with **no user-facing
behaviour change**: refactors, dependency bumps, migrations, cleanups, CI/tooling. No scope, no
spec, no Spec-approved gate. **One invocation, one PR, no gate checkbox** — the lane ends with a
PR the operator squash-merges themselves from GitHub the moment their smoke test passes; the
merge button is the gate, and nothing is left for a second invocation. If behaviour would change
for any persona, it's not a chore — route to the spine (or `bug`).

## Inputs (read only these)

- The user's request (the argument / conversation), or the triage stub.
- The repo's code rules — the file `_shared/conventions.md` points at — and the subtree
  `AGENTS.md` files, where the repo has them.
- `.icm/_shared/github.md` — the lane-PR regime (no gate checkboxes; a human merges in the
  GitHub UI).
- `.icm/_shared/ci.md` — what the checks are and what green means; the hand-off rests on it.
- Only the source the task names. For a migration (symmetric `up`/`down`) or schema-adjacent
  work: the matching capability skill, where the repo ships one (`_shared/project-rules.md` →
  Capability skills).

Context budget: the Inputs table above is the budget (see `.icm/CONTEXT.md` → Layers).

## Process

1. **Pick a slug** (kebab-case) and state the invariant: what must be true before and after
   (behaviour unchanged; only <X> differs). A dep bump names the version delta; a refactor names
   the shape change; a migration names the data delta and its `down`.
2. **Do the work** with the matching capability skill where one exists. Keep it single-purpose —
   a chore PR that also "fixes a few things on the way" is two PRs pretending to be one. Write
   `notes.md` (template below), then open the lane PR:

   ```bash
   .icm/scripts/new-run.sh <slug> --lane chore --summary "<the invariant in one sentence>" \
     [--stub .icm/intake/triage/<name>.md]
   ```

   It commits `.icm/runs/<slug>/`, pushes, opens a **draft** PR (body: Summary with a
   `- slug:` line, Steps to test — **no checklist**), and labels it `type:chore`.

3. **Settle the cheap tier.** `ci-status.sh <slug>` on the draft head → `GREEN`. `RED` → fix on
   the branch, push, re-run the call. `PENDING` → re-run it; nothing-has-failed-yet is not green.
   The one blocking script call is the only CI read — lane PRs, like every pipeline PR, are
   **never subscribed to PR activity** (`_shared/github.md` → PR events).
4. **Finish the run on the branch, while the PR is still draft.** Chores never write a changelog
   page (no user-facing change to announce). Run the close-out:

   ```bash
   .icm/scripts/close-out.sh <slug>
   ```

   It `git mv`s `.icm/runs/<slug>/` into the runs archive (`runs_archive` in `.icm/project.json`;
   `.icm/runs/_done/` by default) and commits that on the branch (the triage stub, if any, is
   already in `triage/_done/` from `new-run.sh`). `RESULT: CLOSED` → push; `RESULT: STOP` → read
   the reason and fix it. Push, then `ci-status.sh <slug>` once more → `GREEN` (the repo's
   required check(s) — `required_checks` in `.icm/project.json` — carry the verdict on a
   docs-only push).

5. **STOP.** Report the preview URLs `ci-status.sh` printed (if any product app built) and say:
   "smoke-test, then squash-merge from GitHub". You do not merge lane PRs and you do not
   re-invoke the lane — the operator's merge click is the gate. After their merge a CI workflow
   the repo owns, where it has one (`_shared/project-rules.md` → Announcing), verifies the
   archive landed (there is no announcement for a chore); don't run it, don't wait. If you
   parked a finding in `.icm/intake/triage/` on the way and the folder now holds more than 60
   active stubs (`ls .icm/intake/triage/*.md | wc -l`; `intake/CONTEXT.md` → Triage → cap), say
   so here — `triage/ holds N active stubs (cap 60) — run triage report` — and name
   `triage report` as the suggested next command.

## Outputs

`.icm/runs/<slug>/run.md` (with `- lane: chore`) and
`.icm/runs/<slug>/lane/output/notes.md` — both archived to the runs archive (`runs_archive` in
`.icm/project.json`; `.icm/runs/_done/` by default) under `<slug>/` by step 4:

```md
# Chore: <slug>

- invariant: <behaviour unchanged; what differs>
- change: <file/area>: <what and why>
- rollback: <migration down / revert — how this is undone if needed>
```

## Verify

- No user-facing behaviour changed; the invariant holds. Migrations have a working `down`; new
  env vars are declared wherever the repo's build reads them (`_shared/project-rules.md` → The
  factory).
- One PR, `type:chore`, no gate checkboxes in its body; you never merged it and never re-invoked
  the lane.
- Everything the run owed was committed **before** the flip, and the push followed it
  immediately — the PR was never mergeable while incomplete, and that post-flip push is what built
  the previews.
- The full gate settled on the flipped head, the migration checks (where the repo has them)
  included — `GREEN`, or a `RED` handed over under `_shared/ci.md`'s one exit with the check
  named, a stub parked and `notes.md` recording it.
  Never a verdict inherited from an earlier head, and never `GREEN` claimed for either.
- No changelog page: a chore has nothing to announce, and `notes.md` says what changed instead.
- `close-out.sh` reported `CLOSED` and its commit is pushed on the PR's head — the archive move
  rides in the PR, so the merge publishes it.
