# Findings jam-292

- The hook `route-request` printed `Route: start JAM-290` for a first message that said `start work on JAM-292`. The message also named JAM-290 and JAM-291 as background. The hook took a key that was not the command's key. This is a fault of the blueprint (`.icm/_system/`), not of this repo.
- The hook `.claude/hooks/block-local-checks.sh` blocked a command that only read a CI log, because its `grep` pattern had the words `tsc` and `eslint`. A read of a CI log is not a local check.
- `web/src/content/privacy.ts` was not read in this run. Not verified: the privacy text says that the team can email a guest about a checkout that the guest did not pay.
- A booking that the team reminded keeps the lead in the stage "Novo". The lead does not move to another stage. The ticket does not ask for a stage change.
- After the merge of #277 (JAM-506), `main` has the folder `.icm/runs/jam-506/` and no `.icm/archive/jam-506/`. `close-out.sh` did not run for that run, or it ran after the merge. The run folder of a merged ticket stays in `.icm/runs/`.
- The agent `review-shots` made no picture for #279: the preview shows the "Log in to Vercel" page in place of the app, as it did for #278. Four unusable pictures (the Vercel login page and a 404 page) are still in `~/baxter_live/workspace/scratch/shots/`, because a hook blocks `rm` in the live folder. They are in no review pack.
- `https://prod.agorasim.pt` answered `404 DEPLOYMENT_NOT_FOUND` on 2026-11-23. Not verified: this is expected before the first promotion.
