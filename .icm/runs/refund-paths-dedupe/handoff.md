# Handoff: refund-paths-dedupe

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once PR #194 (chore `braces-advisory-eslint-chain`, the operator's recorded waiver in
   `pnpm.auditConfig.ignoreGhsas` + `security.audit_command`) is merged, re-run
   `/pipeline release refund-paths-dedupe`: merge `main` in and re-read
   `security-check.sh refund-paths-dedupe --branch --audit` → `OK`. The triage stub this run
   parked was consumed by that chore and removed from this branch.
2. Done already this Release (carry into the record, don't redo): Ready to merge ticked;
   `ci-status.sh` GREEN on 7c9d641 (full gate); `env.sh audit --changed` OK;
   `/code-review` medium — no findings; `/security-review` (payments) — no findings;
   `/production-readiness` — not available in this repo's skills, recorded n/a. Nothing parked by
   the reviews.
3. Then Release steps 5–9: no docs impact; no changelog (`announce: deferred to promotion` — UAT
   repo); merge `main`, `check-migrations.sh`, `retrospective.sh`, the record, close-out, merge.

## Blockers

- blocked on operator: squash-merge PR #194 (the `braces` waiver chore).

## Do not

- Do not waive the advisory on the operator's behalf, and do not merge around the `BLOCKED`.
- Do not edit `booking-refund.test.ts`, `quote-refund.test.ts` or `quotes.test.ts`.
