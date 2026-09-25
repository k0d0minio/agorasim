# Failures: fix-uat-migration-ordering

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

### 2026-09-25 — UAT skipped a migration slotted in front of one it had already applied

- what happened: the UAT deploy failed `pnpm db:verify` — `0031_add_booking_move_seq` not applied
- why: #150 resolved its journal conflict with #148 by inserting its own older-stamped migration at 0031 and renumbering #148's (already on `main`, already applied to UAT) to 0032. `migrations-journal.test.ts` only checks the journal is monotonic, which it still was; it cannot see that an entry was inserted before one a database already holds
- fixed by: 8296060 — `quote_one_draft_per_lead` back at 0031, `add_booking_move_seq` at 0032 with a `when` after it

## Learned rules

- When a Drizzle journal conflicts with `main` at merge, keep every entry `main` already has at its index and stamp, and put this branch's migration last with a `when` newer than all of them — never renumber a merged migration, since UAT applies each merge at build and skips anything stamped before its newest applied row.
