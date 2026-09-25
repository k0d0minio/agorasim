# Status: event-holds-capacity

Where the run is, in five lines. Updated at every stage start and stop, and whenever a flag
flips. A resuming session reads this first, then `handoff.md` (`_shared/stage-preamble.md`).

- phase: build
- step: done — PR ready, waiting on the preview smoke and Ready to merge
- ci: GREEN (blocking); Quality (advisory) RED on backup.test.ts from main (#156), parked in triage
- blocked: yes — on the Ready to merge tick
- updated: 2026-09-25
