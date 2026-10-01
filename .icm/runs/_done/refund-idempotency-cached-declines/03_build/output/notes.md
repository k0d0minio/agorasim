# Build notes: refund-idempotency-cached-declines

- commits: 3d8a0ff feat — key refunds on the attempt, not the row · 8d1e4ee build notes · 2945497 ready · 00d394c build stop · 30aa426 fix — claim fixtures carry cancelledAt
- ci: GREEN (full gate) on 30aa426 — Vercel preview pass, Quality (advisory) pass
- ready: 2026-10-01T13:02:30Z — flipped on 8d1e4ee

## What changed

- `web/src/components/admin/quote-refund-dialogs.tsx`: an `attemptId` (state, `crypto.randomUUID()`) minted on the "Reembolsar" click and again inside the `useActionState` action once the server action answers; posted as a hidden field. Minted in handlers, not during render, so `react-hooks` purity rules stay clean.
- `web/src/lib/form-schemas.ts`: `refundQuotePaymentSchema.attemptId: z.uuid("Recarregue a página e tente de novo.")` — the one message for missing, empty and malformed (zod 4 applies it to the type error too; checked against the installed zod).
- `web/src/app/admin/sales/actions.ts`: passes `attemptId` through; the `refunded-unrecorded` and `refund-failed` comments now say why a retry is a new request.
- `web/src/lib/quote-refund.ts`: `refundQuotePayment` takes `attemptId`; key `quote-refund:<paymentId>:<attemptId>`; `issueInstalmentRefund`'s note rewritten.
- `web/src/lib/booking-refund.ts`: key `booking-refund:<bookingId>:<cancelledAt ms>` via a new `claimedAt(booking)` that throws (→ `refund-failed`) on a row with no `cancelledAt` rather than minting a key from the clock; module note rewritten.
- Tests: `quote-refund.test.ts` — every call passes an `attemptId`; the key-shape assertion; a `stripeKeepsAnswersByKey()` stand-in for Stripe's idempotency layer (first answer kept per key, a decline included) driving the same-attempt replay and the decline-then-retry cases; `failed`/`canceled` → `refund-failed`, nothing written. New `booking-refund.test.ts` — the claim key, and a double submit (stale read + empty claim, then an over booking) reaching Stripe once. `form-schemas.test.ts` — the `attemptId` refusal.

## Acceptance criteria status

- [x] The quote refund dialog posts an `attemptId` that stays the same across a double submit and changes after every result the action returns — minted on open and after each answer; a double submit's FormData is captured at submit time with the same id. Not unit-tested (a client component; no component test harness in the repo) — smoke it.
- [x] A quote refund post without a valid `attemptId` is refused with "Recarregue a página e tente de novo." and makes no Stripe call — schema test; the action returns before `refundQuotePayment` on a failed parse.
- [x] The quote refund's Stripe call carries the key `quote-refund:<paymentId>:<attemptId>` (test)
- [x] Same-attempt double submit of a partial refund → one refund, one audit row, one notice (test)
- [x] Declined, then a new attempt → new key, recorded as refunded (test)
- [x] `failed` / `canceled` → `refund-failed`, nothing written (test)
- [x] Tour key `booking-refund:<bookingId>:<cancelledAt ms>` from the claimed row (test)
- [x] Second `cancelAndRefundBooking` → `not-cancellable`, no Stripe call (test)
- [x] CI green — full gate GREEN on 30aa426, Quality (advisory) pass

## Notes for Release

- Quality (advisory) went red once on 2945497: `src/app/admin/actions.test.ts` faked the booking claim with `cancelledAt: null`; the fixtures now carry one (error.log). No production code changed for it.
- `security-check.sh --branch` → BLOCKED 1, `dependency-audit` only (4 high/critical in next/undici on `main`); this branch touches no dependency file. Already parked: `triage/dependency-advisories-next-undici`, `triage/deps-next-undici-advisories`. The secrets scan passed. Release's `--audit` read needs the operator's waiver or that chore merged first.
- `form-schemas.test.ts` and `src/app/admin/actions.test.ts` were not in the spec's `touches:` — the AC-2 refusal test, and the claim fixtures above; nothing else.
- The replay case leaves `refundedAt` rewritten to the second submit's time (`recordPaymentRefund` sets it on every claimed write) — as the spec noted; nothing else on the row moves.
- Smoke: on the preview with Stripe test keys, open "Reembolsar" on a paid deposit, refund part of it, and check the card; the decline path is proven by the unit tests (a Stripe-side decline is not reproducible on demand in test mode).

## Release

- gate: Ready to merge ticked — merge authorised
- ci: GREEN on the head that merges (ci-status.sh, after the last push — see the PR)
- reviews: code medium — 2 findings: a replayed `attemptId` with an unreadable charge settled twice → fixed on the branch (b22a46c, with a test; its first CI read was red on a test stand-in that reused refund ids — fixed after the close-out, see error.log); the amount edited while a press is pending → does not reproduce (`ArmedSubmit` is disabled while the action is pending, and a disabled default button blocks implicit submission) · security: `security-check.sh --branch --audit` BLOCKED 1 (dependency-audit) → audit waived — next/undici high/critical advisories, pre-existing on `main` and untouched by this branch, chore parked in `triage/deps-next-undici-advisories` (the operator, 2026-10-01); re-read `--branch --no-audit` OK · `/security-review` — no findings · `/production-readiness` n/a — the skill is not installed in this session; the payments surface was covered by `/code-review` and `/security-review` · readiness `env.sh audit --changed`: OK
- parked: none
- migrations: skip — none of this run's own (check-migrations.sh after the merge of `main`)
- learned: retrospective NONE (both classes already rules); 2 rules from `FAILURE.md` synced by close-out
- docs: no docs impact · announce: deferred to promotion
