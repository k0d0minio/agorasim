# Handoff: retire-stale-dependency-advisories

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. PR open — smoke, then squash-merge from GitHub: https://github.com/k0d0minio/agorasim/pull/125

## Blockers

- none

## Do not

- do not bump `next`/`sharp` again here — they were already patched on `main`/`uat` before this
  run started; this run only retired the stale finding and its Learned rules.
