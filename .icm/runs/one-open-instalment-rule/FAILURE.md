# Failures: one-open-instalment-rule

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

### 2026-10-01 — the stub named the wrong reader of the predicate

- what happened: the stub said the "Saldo por pagar" panel read `isBalanceOpen`; Define's grep showed `listUnpaidBalancesDue` (and five other queries and guards in `quotes.ts`) repeat the rule in SQL as `inArray(status, ["pending", "issued"])` and never call either JS copy.
- why: the review finding behind the stub was written from the JS call sites only.
- fixed by: the operator widened the spec in Define to a shared `OPEN_INSTALMENT_STATUSES` read by the SQL too.

### 2026-10-01 — `/code-review` reviewed only the uncommitted run files

- what happened: in Release, `/code-review low` with no target reviewed the working tree's `.icm/runs/**` edits and reported nothing about the code.
- why: with uncommitted changes present it defaults to them, and its branch fallback failed silently in the cloud clone.
- fixed by: re-running it with the branch named as the target after `git remote set-head origin main`.

## Learned rules

- Before speccing a "one definition of X" refactor, grep for the rule's SQL form (`inArray`, `eq` on the same column values) as well as its JS functions — Drizzle queries in `web/src/lib/quotes.ts` restate predicates the code also has as helpers.
- In Release, run `/code-review` with the run branch named as its target (after `git remote set-head origin main`) — with uncommitted run files in the tree it reviews those instead of the branch.
