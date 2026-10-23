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
    promote.sh      status: the batch and what waits on Jamie. approve --by "<who>": the client's word
    uat-db.sh       the Neon branch `uat`, with one Neon project. Not used here: UAT is `uat-agorasim`
    rollback.sh     names the previous production deployment, prints the command, runs nothing
    lib/            vercel.sh and neon.sh, the transports the scripts and the workflows share
  uat/CONTEXT.md    the UAT contract: the environments, the database, the batch, the promotion
  docs/             the research and the client's words behind the engagement
```

The old pipeline (stages, lanes, runs, the shared doctrine, the scripts, the skills) left this
folder on 2026-10-22. Git history holds it.
