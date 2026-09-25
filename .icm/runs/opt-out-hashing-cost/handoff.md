# Handoff: opt-out-hashing-cost

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. `.icm/scripts/ci-status.sh opt-out-hashing-cost` on the draft head, then finish the run
   (retrospective, close-out) and flip the PR ready.

## Blockers

- none yet.
- blocked on operator: once ready, smoke the PR and squash-merge it from GitHub.

## Do not

- Do not implement the "skip the consent rescan on a repeat press" part of the stub as a bare
  `inserted.length === 0` check — it breaks the module's documented retry guarantee (see
  `lane/output/notes.md`).
