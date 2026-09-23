# Handoff: go-live-session-stubs

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. PR #116 is open (ready) into `uat` — smoke the preview (Steps to test in the PR body), then
   squash-merge from GitHub. Nothing is left for a second invocation of this lane.
2. Then `/pipeline chore next-rce-advisories` — the P0 dependency bump this lane parked.

## Blockers

- none

## Do not

- Do not re-invoke the lane or open a second PR for this run.
- Do not bump `next` inside this PR — it is the chore stub's diff.
- Do not tick anything: the merge button is the gate.
