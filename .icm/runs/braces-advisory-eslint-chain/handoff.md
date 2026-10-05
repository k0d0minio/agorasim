# Handoff: braces-advisory-eslint-chain

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. PR open — smoke, then squash-merge from GitHub
   (https://github.com/k0d0minio/agorasim/pull/194). Nothing in the app changes; the smoke is
   that the preview builds.
2. Then resume `/pipeline release refund-paths-dedupe`: merge `main` into its branch, and its
   `security-check.sh --branch --audit` reads `OK`.

## Blockers

- none

## Do not

- Do not add another advisory to `pnpm.auditConfig.ignoreGhsas` without Jamie's word.
