# Runs — one folder per unit of work in flight

`runs/<slug>/` is a run's working home: `run.md` (the pointer index — lane, stub,
branch, PR) plus each stage's `output/`. Spine runs carry
`02_define/output/spec.md` and `03_build/output/notes.md` (Release appends its
`## Release` record there); lane runs carry `lane/output/notes.md` instead. A **front**
run — Scope — carries `01_scope/_source/story.md` and `01_scope/output/scope.md`, and
opens no PR of its own.

```md
# Run: <slug>

- lane: feature            # or front | bug | tweak | chore
- stub: intake/<epic>/<slug>.md   # when spun from one
- branch: claude/<slug>    # recorded, not enforced — written by new-run.sh
- pr: #456                 # the ONE PR — written by new-run.sh (a front has none)
```

**Live folders hold only live work.** The session that merges a run moves it to
`runs/_done/<slug>/` — `.icm/scripts/close-out.sh <slug>`, run on the branch as the last
commit before the merge, so the squash publishes it (`stages/04_release/CONTEXT.md`). A
merged run still sitting here is the alarm that the close-out was missed. Runs are
tracked in git and ride the run's PR, so any device can resume them
(`.icm/_shared/stage-preamble.md`).
