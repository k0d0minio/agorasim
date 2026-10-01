# Project: quote-refund-admin-reads-charge

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-refund-hardening/quote-refund-admin-reads-charge.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/quote-refund.ts, web/src/lib/quote-refund.test.ts
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- Only the admin door's settled total changes; `settleInstalmentRefund`, the webhook door and `booking-refund.ts` stay as they are.
- The idempotency key and the dialog's ceiling stay row-based (stubs 4 and later); the echo race and post-refund write guard are stubs 3 and 2.
- Once Stripe has accepted the refund, nothing on this path may report `refund-failed`.

## Context budget

- Define read `web/src/lib/quote-refund.ts`, the webhook's refund branch and `recordPaymentRefund` to settle the edge cases (stale ceiling, echo convergence, notice arithmetic) — targeted reads, within budget.
