# .icm — the work layer

The map of this folder. The tickets, the scripts that start and finish them, and the
documents behind the engagement. The loop from stub to merge is `intake/CONTEXT.md`, the
blueprint's contract.

```
.icm/
  CONTEXT.md        this map
  project.md        the register: what the project is for, its business rules, its decisions
  intake/           the tickets: epics with a breakdown and stubs, triage, _done/
    CONTEXT.md      the contract: formats, writing rules, the loop
    README.md       this backlog
  scripts/
    new-run.sh      start a ticket: branch, stub into _done/, draft pull request
    close-out.sh    after the last stub: the epic folder into _done/
    promote.sh      the promotion: approve --by "<who>" drafts the Release at the signed-off commit
    deploy-status.sh, rollback.sh, report.sh, lib/   what release.yaml and promote.sh read
  project.json      the names release.yaml, promote.sh and the Neon workflows read (no values)
  _shared/promotion.md   the promotion rule: UAT, the batch, the published Release
  docs/             the research and the client's words behind the engagement
```

The old pipeline (stages, lanes, runs, the shared doctrine, the scripts, the skills) left this
folder on 2026-10-22. Git history holds it.
