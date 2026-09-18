# Stage 04 — Release (contract)

Invoked via `/pipeline release <slug>`. The `/pipeline` router reads this file and follows it.
Release is **one** stage and **one** human decision: by the time this runs, Build has flipped the
PR ready and pushed, the **full gate** has settled on that head (`_shared/ci.md` → verdict by
phase), and the operator has smoke-tested the post-flip previews by hand and ticked **Ready to
merge** — that tick attests all manual/signed-in testing, so this stage never re-asks for it. Your
job: confirm the factory agrees (CI green), run the review passes, park anything off-ticket, put
the one announcement file (where the repo has a changelog) and the close-out on the branch, and
squash-merge. **After the merge you are done** — the announcement belongs to the project's
post-merge notification (`.icm/scripts/notify.sh`, which you hand the one-line summary and
nothing more, or a CI workflow the repo owns — `_shared/project-rules.md` → Announcing), not to
you.

**What may stop the merge — nothing else may:**

1. A **blocking CI failure** (`RESULT: RED`, or a `PENDING` that will not settle).
2. A **security-critical finding introduced by this diff** — an exploitable defect: auth bypass,
   leaked secret, tenant-scoping hole.
3. A **deploy-breaking config finding** — a new env var missing from wherever the repo declares
   its environment or from Vercel, a migration without a working `down`, an index/migration
   mismatch.

Every other finding — style, structure, "should be refactored", anything not this ticket's — is
**parked as a stub in `.icm/intake/triage/`** (shape in `.icm/intake/CONTEXT.md`) and the merge
proceeds. A ticked box plus a green factory is the authorisation; do not manufacture reasons to
hold it.

## Inputs (read only these)

- `.icm/_shared/stage-preamble.md` — run it **first**: resolve the run or STOP.
- `.icm/runs/<slug>/run.md` — branch + PR pointers.
- `.icm/runs/<slug>/02_define/output/spec.md` — acceptance criteria + `complexity:` (review
  effort) + `touches:` (conditional-pass triggers) + personas.
- `.icm/runs/<slug>/03_build/output/notes.md` — what changed, known gaps; the `## Release`
  record is appended here.
- The branch diff (`git diff main...HEAD`) — what the reviews run against.
- `.icm/_shared/github.md` — gate read, review comments, merge; **pipeline PRs are never
  subscribed to PR activity** (its PR-events rule) — CI is read via `ci-status.sh` only.
- `.icm/_shared/ci.md` — what the checks are and what green means.
- `.icm/_shared/knowledge-map.md` — only the page(s) the change touches, for the docs sync and
  the changelog personas.
- The repo's docs sync skill and changelog skill, where it ships them (`_shared/project-rules.md`
  → Capability skills · Announcing) — the docs tree's own format rules and the changelog shape
  (including the one-line summary and the audience the announcement is built from).

Context budget: the Inputs table above is the budget (see `.icm/CONTEXT.md` → Layers). Record
overruns on a one-line `Context budget:` note in the `## Release` record.

## Process

1. **Run the shared preamble**, then confirm Build finished: `notes.md` exists and the PR is
   open (not draft). An acceptance criterion Build already flagged as unmet → send back to
   `/pipeline build <slug>`; don't release known-broken work. Then **project the stage label**:

   ```bash
   .icm/scripts/project-labels.sh <slug> --stage release
   ```

   The PR reads `stage:release` from the moment the stage starts. CI's own projection would only
   move it once the `## Release` record is pushed (step 7), at the end of the stage — and the
   close-out push that follows hides the run folder from the labels step altogether — so Release
   is the one stage that projects its own label (`_shared/github.md` → Labels).

2. **Read the gate.** `pull_request_read` (method `get`) → **Ready to merge** must be `[x]`.
   Unticked → **STOP** and tell the operator — this is the stage's one stop-and-wait, and you
   never tick it yourself. The tick means the preview was smoke-tested by hand; anything that had
   failed that testing would have gone back to Build instead.
3. **Establish CI green — the precondition for everything below.**

   ```bash
   .icm/scripts/ci-status.sh <slug>
   ```

   `RED` → fix on the branch if it is this ticket's, else back to `/pipeline build <slug>`.
   `PENDING` → re-run the call; an unsettled run is not a pass. `GREEN` → note the SHA and carry
   on. The script names the tier: a ready head settles the **full gate** — a cheap-tier verdict
   here means the PR is somehow still draft, which is Build unfinished, not a pass.

   Your own docs/changelog/close-out pushes below need not re-earn this verdict at full price
   where the repo's quality workflow carries a settled verdict forward across a push whose diff
   is entirely verdict-preserving (`.icm/**`, markdown, the archive move) — whether it does, and
   how it says so, is the repo's own (`_shared/project-rules.md` → The factory). Any code in the
   push — the merge of `main` in step 7 included, when `main` moved — takes the full path again.
   Re-run `ci-status.sh` after the last push either way — the carry is CI's optimisation, never
   a licence to skip the settled-verdict read.

4. **Run the review passes, then triage every finding by the rule.**
   - **Code review — always, in-session.** Run **`/code-review`** at the spec's complexity
     (`trivial → low`, `standard → medium`, `complex → high`). There is no CI review job; this
     pass is the review.
   - **`/production-readiness`** — only if the diff touches DB, auth, payments, or env vars.
   - **`/security-review`** — only if the diff touches auth, payments, PII, or route policies.
   - **The triage rule** for every finding, review comments included:
     - Trivial **and** in-ticket → fix now, on this branch.
     - Security-critical or deploy-breaking (the two stop classes above) → **STOP**, report
       exactly what and why, send back to Build.
     - Everything else → one stub in `.icm/intake/triage/`, and move on. Never widen the PR to
       fix it here. **Cap notice:** if the folder then holds more than 60 active stubs
       (`ls .icm/intake/triage/*.md | wc -l`; `intake/CONTEXT.md` → Triage → cap), say so in
       the step 9 report — `triage/ holds N active stubs (cap 60) — run triage report` — and
       name `triage report` as the suggested next command. The stub is still written and
       the merge still proceeds.
5. **Sync the docs (in this PR).** If the change alters documented reality — a page under the
   docs tree (`docs_path` in `.icm/project.json`; `_shared/knowledge-map.md` names them) — update
   the affected page(s) on the branch via the repo's docs sync skill, where it ships one
   (`_shared/project-rules.md` → Capability skills); otherwise edit the page under the docs
   tree's own conventions. Record "no docs impact" when true — and always, for a repo with no
   docs tree.
6. **Write the one announcement file**, where the repo has a changelog
   (`_shared/project-rules.md` → Announcing names where it lives and the skill that owns its
   shape): the entry for today (the merge date) and this slug, with its one-line summary and its
   audience (`public` for user-facing, `internal` for infra/security/perf — internal entries are
   announced but not listed publicly, where the repo makes that distinction). This file is the
   changelog and the ship note in one, and its summary is what the post-merge notification
   (step 9) sends. Truly nothing to announce, or a repo with no changelog → write no page and
   record `announce: none`.
7. **Bring `main` in, then push the record — in two pushes, in this order.**

   **(a) Merge `origin/main` into the run branch** — a merge commit, never a rebase:

   ```bash
   git fetch origin main && git merge --no-edit origin/main
   ```

   This is what lets the close-out's sibling-run check see runs archived on `main` since the
   branch was cut — without it, an epic whose last sibling merged yesterday looks unfinished and
   stays in `.icm/intake/`. Resolve conflicts if there are any; **a conflict inside
   `.icm/runs/<slug>/` itself is a STOP** — someone else wrote to this run, and you do not guess
   which record is true.

   **(b) Append the `## Release` record to `notes.md`** (template below), commit it **with the
   docs edits and the changelog page**, and push. This push is the one the Pipeline workflow's
   release-completeness step reads — it sees `notes.md` at its `.icm/runs/` path, with the
   record in it, next to the docs and changelog files it checks for.

   **(c) Then close the run out, as its own commit and its own push:**

   ```bash
   .icm/scripts/close-out.sh <slug>
   ```

   It `git mv`s `.icm/runs/<slug>/` into the runs archive (`runs_archive` in `.icm/project.json`;
   `.icm/runs/_done/` by default) — and the intake epic with it, if this stub was the last one it
   had left unshipped — and commits that on the branch.
   `RESULT: CLOSED` → push. `RESULT: STOP` → read the reason and fix it; do not merge a run you
   could not close out. The move is the last thing written because the record it archives has to
   be complete first, and it travels alone so the push carries **only the move** — the rename
   hides the `.icm/runs/` path from CI, which is why the record went first.

   After the last push, **re-run `ci-status.sh --pr <number>` on the head you just pushed** — one
   settled verdict per push, and the last one is the verdict that authorises the merge. Prefer
   `--pr <number>` here; `<slug>` still works (the script resolves the run from the archive).

8. **Merge.** Re-read the gate (one call — it must still be `[x]`), then `merge_pull_request`,
   `merge_method: "squash"`, attempted **once** (`_shared/github.md`). The squash carries the run
   record, docs, changelog **and the archive move** onto `main` — the merge is what publishes the
   close-out, which is why nothing has to run afterwards to finish the job.
9. **Repoint, notify, report.** Update the PR body's spec link to its `blob/main/` form
   (`update_pull_request`) — the only post-merge edit. Then hand the one-line summary of what
   shipped (the changelog page's one-liner, where there is one) to the project's post-merge
   notification — `.icm/scripts/notify.sh "<summary>"` — unless the record says
   `announce: none`; what it does with it (a chat post, or nothing because a CI workflow the
   repo owns announces on the merge) is the project's own (`_shared/project-rules.md` →
   Announcing). **Do not wait or poll for that workflow** — it announces and, where the repo
   wires it so, checks the archive landed; a failure reaches the project's alert channel
   (→ Announcing), where it has one. Then tell the operator: what merged (SHA), what was parked
   in triage (by stub name), and that the run is archived.

## Outputs

Appended to `.icm/runs/<slug>/03_build/output/notes.md`:

```md
## Release

- gate: Ready to merge ticked — merge authorised
- ci: GREEN on <sha> (ci-status.sh, after the last push)
- reviews: code <effort> · security <run — result | n/a> · readiness <run — result | n/a>
- parked: <triage stub filename(s) | none>
- docs: <pages updated | no docs impact> · announce: <public | internal | none>
```

Plus the changelog page, where the repo has one (unless `announce: none`), and any docs edits —
all in the one PR.

## Verify (before declaring released)

- `stage:release` was projected at step 1, before anything else was read or written.
- The gate was ticked **before** the merge and re-read after the last push; you never ticked it.
- The merge rested on a **settled `GREEN` from `ci-status.sh` on the exact head that merged** —
  established after your last push, never inherited, never read off a Vercel event or the
  `Vercel Preview Comments` check. Merged once; never on RED, never on PENDING.
- The only holds you applied were the three stop classes. Every other finding is a triage stub
  (named in the record), not an unmerged PR and not a widened diff.
- The conditional passes ran whenever `touches:`/the diff matched — "n/a" is recorded with the
  reason, never silently skipped.
- The `## Release` record and the changelog page (where the repo has one) were **committed
  before the squash** — the merge is what publishes them, so what is in them at merge time is
  what is true and what is sent.
- `close-out.sh` ran on the branch **after `origin/main` was merged in**, reported `CLOSED`,
  and its commit was pushed **on its own** and is in the head that merged. This bullet is the
  whole prevention: a merge without it leaves the run in `.icm/runs/` — a fault the post-merge
  verification, where the repo has one, reports to the project's alert channel
  (`_shared/project-rules.md` → Announcing) — and once merged, nothing can carry the move into
  that PR. There is no recovery PR; the run's own PR is the only vehicle.
- After the merge you touched nothing but the PR body's spec link and the one `notify.sh` call,
  and left the announcing itself to the project's notification (`_shared/project-rules.md` →
  Announcing).
