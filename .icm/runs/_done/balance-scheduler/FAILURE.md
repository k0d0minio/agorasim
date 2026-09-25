# Failures: balance-scheduler

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

### 2026-09-25 — the spec ordered the link rotation before the log claim

- what happened: the spec said "pre-check the log → rotate the link (CAS) → send". Build found that a second run reading the quote after the first run's swap, but before its claim, could rotate again and kill the link the first run was mailing.
- why: the claim is the only arbiter across runs, and anything with a side effect done before it can be done twice. The pre-check is only a read.
- fixed by: `ClaimedMessage` in `sendLoggedEmail` (the message is built only by the claim winner, and never without a claim row); decisions D-4.

### 2026-09-25 — a base-branch migration order broke UAT and every preview mid-run

- what happened: `0031_add_booking_move_seq` merged after `0032` had been applied to `uat-agorasim`, so drizzle skipped it and `db:verify` failed UAT and this run's draft previews.
- why: two runs in flight each stamped a migration; the one with the older `when` merged second.
- fixed by: #154 on `main`, merged into this branch before the flip.

## Learned rules

- A scheduled email whose making has a side effect (minting a link, rotating a token) must take its message-log claim first — pass a `ClaimedMessage` builder to `sendLoggedEmail`, never a prebuilt message — and must write the email before it retires the old value.
