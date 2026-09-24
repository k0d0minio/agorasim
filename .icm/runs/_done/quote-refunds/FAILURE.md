# Failures: quote-refunds

The run's retrospective — what cost a turn, and the rule that would have prevented it. Two
files share this job and split it cleanly: `error.log` (in the stage's `output/`) is the ledger
of errors a **tool** reported, written verbatim at the moment of the fix with its `- resolved:`
and `- rule:` lines, which `retrospective.sh` reads and counts across runs; **this file** is
what the run as a whole learned — a wrong assumption, a STOP, a skipped step, a gate that
blocked, a plan that had to be rewritten — which no tool ever logged. On close-out the
`## Learned rules` bullets below are copied into `_shared/project-rules.md` → Learned rules
(`run-pack.sh <slug> --sync-rules`, called by `close-out.sh`, the same shape as
`retrospective.sh --apply`), so the next run in this repo starts with them. Keep the rules
general; keep the retrospectives specific; never restate an `error.log` entry here.

## Retrospectives

### 2026-09-24 — the refund dialog could not be reopened after a successful refund

- what happened: Release's code review found that `RefundQuotePaymentDialog` opens only while `!state.ok`; after one refund and `router.refresh()` the component kept its state (same key), so a second partial refund was impossible without a full reload.
- why: the dialog copied `cancel-booking-dialog.tsx`'s `open && !state.ok` pattern, which is safe there because a cancelled booking loses its button; a partly refunded instalment keeps its.
- fixed by: keying the dialog on `payment.id:refundedAmountCents` in `lead-quote-card.tsx` (Release commit).

### 2026-09-24 — `/security-review` could not start: `origin/HEAD` unset in the cloud clone

- what happened: the skill's `git log origin/HEAD...` failed with "ambiguous argument".
- why: a fresh cloud checkout has no `origin/HEAD` symbolic ref.
- fixed by: `git remote set-head origin main`, then the skill ran.

## Learned rules

- An admin dialog that closes on `useActionState`'s `state.ok` stays closed for good unless its component is keyed on the row value the action changes — key it, or derive `open` from a fresh state (as `ConfirmedQuoteAction` does), whenever the action leaves its trigger on screen.
- In a cloud session, run `git remote set-head origin main` before `/security-review` — it diffs against `origin/HEAD`, which a fresh clone lacks.
