# Stub: close-out.sh's git mv can drop a usage-snapshot "end" line written just before it runs

- lane: chore
- found-by: template-change · 2026-09-24

## Problem

`usage-snapshot.sh <slug> bug end` appended its line to `.icm/runs/<slug>/usage.md` and reported
`RESULT: RECORDED` immediately before `close-out.sh <slug>` ran (the correct order, per the bug
lane contract). The commit `close-out.sh` produced (`8ba2ccc514ec0e1c53bec647fe9c892d36b731c3`,
run `fix-move-back-suppresses-reminder`) shows the git-mv'd `usage.md` as a pure rename — zero
insertions, zero deletions — carrying only the `start` line the earlier `new-run.sh` commit
already had. The same failure class hit `quote-one-draft-race` earlier the same day (fixed by
hand with its own `Wrap: quote-one-draft-race — carry the chore-end usage line into the archive`
commit). Two independent runs losing the same line the same day points at the mechanism, not the
session.

## Proposed change

Make `close-out.sh`'s archive move pick up whatever is on disk in the run folder at call time —
for example `git add -A -- ".icm/runs/$slug"` before the `git mv ".icm/runs/$slug"
"$runs_archive/$slug"` — and add a fixture: append a line to a tracked file inside a run folder
without committing, run `close-out.sh`, and assert the archived commit's content includes the
appended line.

## Prompt

Template change request — from agorasim · 2026-09-24

In the icm-board repo (`~/Apps`), change the template-owned file
`_system/template/icm-pipeline/scripts/close-out.sh` (in every pipeline repo:
`.icm/scripts/close-out.sh`, a `T` line of the MANIFEST). Read `_system/contracts/PIPELINE.md` →
File-level ownership first.

What it says today (agorasim's copy, `.icm/template-version`):
> git mv ".icm/runs/$slug" "$runs_archive/$slug" \
>   || die "could not archive the run folder"

What it should say or do:
Make the archive move pick up a file inside the run folder that was modified in the working tree
immediately before `close-out.sh` runs — concretely, the `end` line `usage-snapshot.sh <slug>
<stage> end` just appended to `usage.md`, per the lanes' and Release's own contract ("Record the
lane's end first ... so the line rides in the close-out commit"). Today the git-mv'd file can land
in the archive commit as a pure rename of the last commit's content, silently dropping the
unstaged edit. Fix `close-out.sh` — for example, stage the run folder's current working-tree state
(`git add -A -- ".icm/runs/$slug"`) before the `git mv`, so the subsequent commit always carries
whatever was on disk at call time, whether or not the `git mv` itself picks it up — so the commit
it produces always carries whatever was on disk at call time. Add a fixture that reproduces this:
write a run folder, append a line to `usage.md` without committing, run `close-out.sh`, and assert
`git show <the commit>:<archived-path>/usage.md` contains the appended line.

Why:
Run `fix-move-back-suppresses-reminder` (agorasim, bug lane, 2026-09-24) called `usage-snapshot.sh
fix-move-back-suppresses-reminder bug end` (reported `RESULT: RECORDED`, appending the `end`
line) immediately before `close-out.sh fix-move-back-suppresses-reminder` (reported `RESULT:
CLOSED`). The resulting commit `8ba2ccc514ec0e1c53bec647fe9c892d36b731c3` shows
`.icm/runs/{ => _done}/fix-move-back-suppresses-reminder/usage.md | 0` — a pure rename, no content
change — so the `end` line never reached the archive; it had to be restored by hand in a
follow-up `Wrap:` commit on the run's own branch. The same failure, independently, cost
`quote-one-draft-race` (also agorasim, same day) a `Wrap: quote-one-draft-race — carry the
chore-end usage line into the archive` commit. Losing the same class of line twice in one day in
one repo means every pipeline repo running this template is exposed to it.

Then: prove it (the fixture above, or a read-only run against `projects/agorasim` on Jamie's
machine), ship it through a PR on a `claude/` branch, and after the merge bring it back with
`_system/scripts/icm-sync.sh --apply projects/agorasim` — the other pipeline repos as
`/icm-check` lists them. Do not edit `projects/agorasim/.icm/scripts/close-out.sh` in place.
Retire `projects/agorasim/.icm/intake/triage/template-change-close-out-usage-end-line.md` to
`_done/` in the sync commit.
