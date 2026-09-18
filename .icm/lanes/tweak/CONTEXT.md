# Lane — Tweak (contract)

Invoked via `/pipeline tweak "<small adjustment>"` — or `/pipeline tweak <stub-name>` to start
from a parked finding in `.icm/intake/triage/` (the router resolves the name; the stub pre-seeds
the request and `new-run.sh --stub` moves it to `triage/_done/`). A fast lane for tiny, low-risk,
already-clear changes — copy, spacing, a label, a default, a threshold. No scope, no spec, no
Spec-approved gate. **One invocation, one small PR, no gate checkbox** — the lane ends with a PR
the operator squash-merges themselves from GitHub the moment their smoke test passes; the merge
button is the gate, and nothing is left for a second invocation. If it needs a decision the user
hasn't already made, or touches data/auth/payments, it isn't a tweak — STOP and route to
`/pipeline scope` (or `bug`/`chore` if that's what it really is).

## Inputs (read only these)

- The user's request (the argument / conversation), or the triage stub.
- The repo's code rules — the file `_shared/conventions.md` points at — and the subtree
  `AGENTS.md` files, where the repo has them (sentence case, typography, tokens — most tweaks
  live in these rules).
- `.icm/_shared/github.md` — the lane-PR regime (no gate checkboxes; a human merges in the
  GitHub UI).
- `.icm/_shared/ci.md` — what the checks are and what green means; the hand-off rests on it.
- Only the file(s) being adjusted.

Context budget: the Inputs table above is the budget (see `.icm/CONTEXT.md` → Layers).

## Process

1. **Pick a slug** (kebab-case) and confirm the change is fully specified by the request — a
   tweak has no open questions by definition. An open question → STOP and route.
2. **Make the adjustment** — smallest possible diff, house style, matching capability skill if one
   applies (where the repo ships one — `_shared/project-rules.md` → Capability skills). Write
   `notes.md` (template below), then open the lane PR:

   ```bash
   .icm/scripts/new-run.sh <slug> --lane tweak --summary "<the adjustment in one sentence>" \
     [--stub .icm/intake/triage/<name>.md]
   ```

   It commits `.icm/runs/<slug>/`, pushes, opens a **draft** PR (body: Summary with a
   `- slug:` line, Steps to test — **no checklist**), and labels it `type:tweak`.

3. **Settle the cheap tier.** `ci-status.sh <slug>` on the draft head → `GREEN`. `RED` → fix on
   the branch, push, re-run the call. `PENDING` → re-run it; nothing-has-failed-yet is not green.
   The one blocking script call is the only CI read — lane PRs, like every pipeline PR, are
   **never subscribed to PR activity** (`_shared/github.md` → PR events).
4. **Finish the run on the branch, while the PR is still draft.** If the change is user-visible
   enough to announce, write the repo's changelog page (`_shared/project-rules.md` → Announcing
   names where it lives and the skill that owns its shape; a repo with no changelog records
   `announce: none`) — otherwise record `not warranted` in `notes.md`. Run the close-out:

   ```bash
   .icm/scripts/close-out.sh <slug>
   ```

   It `git mv`s `.icm/runs/<slug>/` into the runs archive (`runs_archive` in `.icm/project.json`;
   `.icm/runs/_done/` by default) and commits that on the branch (the triage stub, if any, is
   already in `triage/_done/` from `new-run.sh`). `RESULT: CLOSED` → push; `RESULT: STOP` → read
   the reason and fix it. Push, then `ci-status.sh <slug>` once more → `GREEN` (the repo's
   required check(s) — `required_checks` in `.icm/project.json` — carry the verdict on a
   docs-only push).

5. **STOP.** Report the preview URLs `ci-status.sh` printed and say: "smoke-test, then
   squash-merge from GitHub". You do not merge lane PRs and you do not re-invoke the lane —
   the operator's merge click is the gate. After their merge the project's post-merge
   notification — `.icm/scripts/notify.sh`, or a CI workflow the repo owns
   (`_shared/project-rules.md` → Announcing) — announces (if a changelog page rode along) and,
   where the repo has a verify job, checks the archive landed; don't run it, don't wait. If you
   parked a finding in `.icm/intake/triage/` on the way and the folder now holds more than 60
   active stubs (`ls .icm/intake/triage/*.md | wc -l`; `intake/CONTEXT.md` → Triage → cap), say
   so here — `triage/ holds N active stubs (cap 60) — run triage report` — and name
   `triage report` as the suggested next command.

## Outputs

`.icm/runs/<slug>/run.md` (with `- lane: tweak`) and
`.icm/runs/<slug>/lane/output/notes.md` — both archived to the runs archive (`runs_archive` in
`.icm/project.json`; `.icm/runs/_done/` by default) under `<slug>/` by step 4:

```md
# Tweak: <slug>

- change: <file/area>: <before → after, one line>
- changelog: <entry added | not warranted | announce: none>
```

## Verify

- The diff is as small as the request; nothing was decided on the user's behalf.
- One PR, `type:tweak`, no gate checkboxes in its body; you never merged it and never re-invoked
  the lane.
- Everything the run owed was committed **before** the flip, and the push followed it
  immediately — the PR was never mergeable while incomplete, and that post-flip push is what built
  the previews.
- The full gate settled on the flipped head — `GREEN`, or a `RED` handed over under
  `_shared/ci.md`'s one exit with the check named, a stub parked and `notes.md` recording it.
  Never a verdict inherited from an earlier head, and never `GREEN` claimed for either.
- The changelog page is in the PR, or `notes.md` records it as not warranted (or
  `announce: none`, where the repo has no changelog).
- `close-out.sh` reported `CLOSED` and its commit is pushed on the PR's head — the archive move
  rides in the PR, so the merge publishes it.
