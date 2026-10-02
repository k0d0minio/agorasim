# Status: reservar-embedded-checkout

Where the run is, in five lines. Updated at every stage start and stop, and whenever a flag
flips. A resuming session reads this first, then `handoff.md` (`_shared/stage-preamble.md`).

- phase: release
- step: 4 (readiness — env.sh audit --changed GAPS 1)
- ci: GREEN (full gate, 11d8162)
- blocked: yes — on operator: STRIPE_PUBLISHABLE_KEY missing on Vercel Production (and confirm the uat custom environment carries it)
- updated: 2026-10-02
