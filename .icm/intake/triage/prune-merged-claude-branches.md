# Stub: ~70 merged claude/* branches, one carrying dead code

- lane: chore
- found-by: ticket-scout (/project) · 2026-09-18
- priority: P2

## Problem

~60 `origin/claude/*` heads and 10 local branches are squash-merge leftovers
(`git branch -r --no-merged main` lists them); `claude/cancellation-self-serve` (`408bead`,
2026-09-01) carries a parallel attempt superseded by #72. Live: only PR #100's branch and the
bot's #99. Noise in every `gh pr create` and branch listing.

## Proposed change

Delete the merged remote branches after confirming each has no open PR; delete the local
leftovers; leave `claude/pipeline-profile` and #100's branch. Consider `delete_branch_on_merge`
on the repo (Jamie's setting).

## Prompt

In the agorasim repo, read `.icm/intake/triage/prune-merged-claude-branches.md`. List the
remote `claude/*` branches with no open PR whose commits are all on `main`, show Jamie the
list, and delete only what he confirms. Nothing else. `git mv` the stub to `_done/` in a
ticket-only commit.
