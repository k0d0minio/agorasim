# Stage preamble — resolve the run, or STOP (Layer 3 reference)

The single canonical procedure for **adopting** an existing run into the working tree. `revise`,
Build and Release run it before anything else. **The front never runs it** — Scope creates the
run folder and Define creates the branch + PR — and **the lanes never run it**: a lane is one
invocation that ends in a PR the operator merges from GitHub, so there is no lane run to resume.
The guard below applies only to the adopting stages.

## Procedure

1. **Resolve the run with one blocking call** — don't read `run.md`, search for the PR, or check out a
   branch by hand. `resolve-run.sh` does all of that deterministically (read `run.md` if it's already
   in the tree or the archive; otherwise find the PR by slug in the repository's own pulls listing —
   the slug line in an open PR's body first, then an open PR whose head branch is `claude/<slug>`
   or ends in `-<slug>`, then the recently closed PRs; never the search API — then fetch + check
   out the run's branch, logging which route resolved it) and spends no model
   tokens doing it:

   ```bash
   .icm/scripts/resolve-run.sh <slug>
   ```

   - Exit 0 / `RESULT: READY` → the run's branch is checked out and `.icm/runs/<slug>/run.md` is
     in the working tree. Go to step 2.
   - Non-zero / `RESULT: STOP` → no run resolved: Define has not run for this slug (or the slug is
     wrong). **STOP.** Do **not** create `runs/<slug>/`, a spec, a `run.md`, or a branch, and do not
     fall back to `git checkout -b`. Recreating the folder fabricates an unspecced run and orphans the
     real one. Tell the user to run `new` (the next intake stub, or `new <stub-name>`) — or to fix
     the slug — and stop. (The script itself never creates anything — it only reports `STOP`.)

2. Load the stage contract (`.icm/stages/NN_*/CONTEXT.md`) and follow it.

The resolver reads a GitHub token (`GITHUB_TOKEN` or `GH_TOKEN`) from the environment for the PR
lookup — and, optionally, `GITHUB_REPO` / `GITHUB_API_URL`. Its header documents the full signature,
the lookup order and the verdict vocabulary.
