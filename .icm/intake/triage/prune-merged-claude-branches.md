# Stub: Prune the `claude/*` remotes — and settle how "merged" is even decided here

- lane: chore
- found-by: `triage/_done/harvest-admin-audit-branch.md` closure · 2026-08-31
- priority: P2
- size: S

## Problem

Eighteen `claude/*` branches sit on origin. Jamie approved deleting the merged ones on
2026-08-31, but the harvest session's permission classifier refused the delete-refspec
push, so the prune never ran and the approval is still outstanding.

Picking it up now runs into something the approval assumed and this repo does not
provide: **there is no mechanical signal for "this branch's PR merged."** All three
checks disagree with the evidence, and the 2026-08-31 triage ran each of them:

- `git branch -r --merged origin/main` returns **nothing**. No branch tip is an
  ancestor of `main`.
- The GitHub API reports `"merged": false, "state": "closed"` on **every PR in the
  repo, #2 through #61** — including #60, whose title is literally `main`'s current
  HEAD commit. PRs here are landed by some route other than the merge button and then
  closed, so the `merged` flag is false across the board and means nothing.
- `git diff origin/main...origin/<branch>` is **non-empty for all eighteen**, so
  content-identity does not separate them either. The work landed with edits on top.

So a scripted prune is not available, and none of those signals can tell a landed
branch from a live one.

`claude/admin-delete-apagar-token-yp18z2` shows both halves of this. When the triage
began it was PR #61, closed, its stub `admin-portugues/delete-token-apagar` still
open — live work that a merged-check would have deleted. PR #61 then landed as
`cdb2272` while the triage was still running, and the stub moved to `_done/`. The
GitHub API still reports `"merged": false` on it. Nothing about the branch's git or
API state changed when the work landed; only the stub folder did.

That is the finding: **the `_done/` folder is the only place in this repo where
"landed" is actually recorded.** Which is a workable prune signal — it is just not
one any git or GitHub command knows about.

Nothing breaks while the branches sit there. This is tidiness, and it is a stub rather
than a task because the tidying needs a judgment the repo cannot supply on its own.

## Proposed change

Two things, in this order.

1. **Decide the signal.** Either start landing PRs through the merge button (after
   which `merged` is true and the prune is a one-liner forever), or agree that the
   record of "landed" is the stub in `_done/` and prune against *that*. This is the
   part worth Jamie's minute; the branches are the symptom.
2. **Prune what the decision clears**, per branch, against the open-stub list — a
   branch whose stub is still open in a live epic stays, regardless of what any git
   command says about it.

## Acceptance criteria (rough)

- [ ] Every branch is checked against its stub's folder before deletion, not against
      `--merged` or the API's `merged` flag
- [ ] Every deleted branch is named in the commit that deletes it, with why
- [ ] Anything ambiguous is reported to Jamie, not deleted
- [ ] How "merged" is decided in this repo is written down somewhere durable

## Prompt

In the agorasim repo, prune the `claude/*` remotes per
`.icm/intake/triage/prune-merged-claude-branches.md`. Read the Problem section first —
it records three signals that all fail here (`--merged` returns nothing, the GitHub
API says `merged: false` on every PR including ones on `main`, and every branch still
diffs against `main`), so **do not script this off a merged-check**. Put the signal
question to Jamie, then delete only branches he clears, cross-checking each against
the stubs in `.icm/intake/*/` — a branch whose stub is still open outside `_done/` is
live work and must survive, whatever git or the API says about it. Re-derive that list
when you pick this up rather than trusting the state described above: it changed once
during the triage that wrote this stub. Needs a session with push rights; the last
attempt was refused by its permission classifier. Branch deletion only — no code.
