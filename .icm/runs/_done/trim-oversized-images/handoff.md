# Handoff: trim-oversized-images

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Run `.icm/scripts/close-out.sh trim-oversized-images`, push, then confirm
   `ci-status.sh trim-oversized-images` → `GREEN` once more on the close-out head.

## Blockers

- none
- blocked on operator: squash-merge PR #151 from GitHub once the smoke passes — that is the
  lane's only gate.

## Do not

- Do not re-invoke this lane — the PR is the deliverable; the operator merges it.
- Do not touch `.icm/intake/triage/oversized-images-in-git.md` further — it already moved to
  `_done/`.
