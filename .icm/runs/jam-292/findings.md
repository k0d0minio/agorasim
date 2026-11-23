# Findings jam-292

- The hook `route-request` printed `Route: start JAM-290` for a first message that said `start work on JAM-292`. The message also named JAM-290 and JAM-291 as background. The hook took a key that was not the command's key. This is a fault of the blueprint (`.icm/_system/`), not of this repo.
- The hook `.claude/hooks/block-local-checks.sh` blocked a command that only read a CI log, because its `grep` pattern had the words `tsc` and `eslint`. A read of a CI log is not a local check.
- `web/src/content/privacy.ts` was not read in this run. Not verified: the privacy text says that the team can email a guest about a checkout that the guest did not pay.
- A booking that the team reminded keeps the lead in the stage "Novo". The lead does not move to another stage. The ticket does not ask for a stage change.
- After the merge of #277 (JAM-506), `main` has the folder `.icm/runs/jam-506/` and no `.icm/archive/jam-506/`. `close-out.sh` did not run for that run, or it ran after the merge. The run folder of a merged ticket stays in `.icm/runs/`.
