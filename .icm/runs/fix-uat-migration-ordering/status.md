# Status: fix-uat-migration-ordering

Where the run is, in five lines. Updated at every stage start and stop, and whenever a flag
flips. A resuming session reads this first, then `handoff.md` (`_shared/stage-preamble.md`).

- phase: lane
- step: 5 — PR open, ready
- ci: GREEN (cheap tier); full gate settles after the flip
- blocked: no
- updated: 2026-09-25
