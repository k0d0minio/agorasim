# Failures: guest-calendar-polish

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

### 2026-10-01 — `status.md` committed empty at Define

- what happened: the Define commit carried a zero-byte `status.md`; Build found it on resume.
- why: an inline script opened the file for writing before reading it, truncating it.
- fixed by: Build restored it from the pack seed (`a3cd974`) and rewrote the five lines.

### 2026-10-01 — the clock's drop borrowed the party's sentence

- what happened: `/code-review` at Release found that a day removed by the new browser notice
  check showed the checkout's "no longer has a car free for this group" line, and in the
  enquiry form vanished with no message.
- why: Build reused the picker's one existing "dropped" path (`dropped` → `partyChanged`) for a
  new cause, and gave the uncontrolled picker a drop without a sentence.
- fixed by: `dda81e9` — `droppedUnavailable` and `calendar.dayUnavailable`, chosen by cause.

## Learned rules

- When a new rule can take away something the guest already chose (a day, a slot, an add-on), give that drop its own sentence naming its own cause — never reuse an existing drop message written for another cause, and never drop silently.
