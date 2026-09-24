# Status: day-before-reminder

Where the run is, in five lines. Updated at every stage start and stop, and whenever a flag
flips. A resuming session reads this first, then `handoff.md` (`_shared/stage-preamble.md`).

- phase: release
- step: 4 (reviews done, fixes pushed in facadba; readiness gate open)
- ci: GREEN on 86b3341 (full gate); facadba settling
- blocked: yes — env.sh audit --changed reads GAPS 1: CRON_SECRET missing on Vercel/agorasim (stop class 3). Jamie is setting it; the release resumes when the audit reads OK
- updated: 2026-09-24
