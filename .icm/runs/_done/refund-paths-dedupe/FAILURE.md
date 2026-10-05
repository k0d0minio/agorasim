# Failures: refund-paths-dedupe

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

### 2026-10-05 — a read-count criterion went stale while the run waited on its gates

- what happened: the spec's "`sendRefundNotice` makes one quote read" was met at Build, then
  `fix-quote-refund-double-submit-notice-order` (#189) merged a second, deliberate read inside the
  message-log claim; the Release merge of `main` conflicted on it, and keeping #189's
  correctness fix means the notice now reads the quote twice (no `getPayment`).
- why: the epic was sequenced so the dedupe went last, but lanes outside the epic kept changing
  the same function (#185, #189) between Define and Release.
- fixed by: the Release merge resolved onto #189's in-claim read and kept only this run's
  `getPayment` drop (merge commit 3519343).

### 2026-10-05 — Release held on a dependency advisory no bump could clear

- what happened: `security-check.sh --branch --audit` blocked on `braces` GHSA-vfj7-8cjw-p6xm
  (dev-only, no patched release); `pnpm.auditConfig.ignoreGhsas` alone did not clear it because
  the gate reads pnpm's `metadata` counts, which still count an ignored advisory.
- why: the gate's default pnpm reader and pnpm's ignore list disagree.
- fixed by: chore `braces-advisory-eslint-chain` (#194) — the operator's waiver in the ignore list
  plus `security.audit_command` so the gate judges pnpm's exit code.

## Learned rules

- In a spec, name the call that must go (`no getPayment in sendRefundNotice`), never a total of
  reads or calls in a function other open runs can also change — a sibling's correctness fix can
  add one legitimately before this run merges.
