# Status: refund-idempotency-cached-declines

Where the run is, in five lines. Updated at every stage start and stop, and whenever a flag
flips. A resuming session reads this first, then `handoff.md` (`_shared/stage-preamble.md`).

- phase: release
- step: 4 — reviews done; waiting on the operator's audit waiver
- ci: GREEN (full gate, 30aa426)
- blocked: yes — dependency-audit BLOCKED (main's next/undici advisories) needs the operator's waiver
- updated: 2026-10-01
