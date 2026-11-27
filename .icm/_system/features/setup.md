# Setup — the setup helper and the gap monitor

Language: pt-PT

## Purpose

One list of the setup items of this repo, checked by one script: a new repo gets help to
set up, and a repo at a new blueprint version shows each gap of its configuration before
any work (1.0.0-rc36).

## Inputs

- `.icm/_system/setup/items.json`: the items for the answers of this repo. An item has an
  id, an owner (S: a session, J: the operator, B: BAXTER), a text, its act in
  `.icm/setup/`, a probe, `block`, and the fix. `.icm/setup/checklist.md` comes from it.
- `.icm/_system/scripts/setup.sh`: the probes. A probe reads a file of this repo, GitHub
  with `gh` (the ruleset, a secret or a variable by name, a setting), or the keyring of
  BAXTER by account name. It never reads or prints a secret value. An item with no probe
  reads its tick in `checklist.md`.

## Process

1. **`setup`, or a new repo.** Run `.icm/_system/scripts/setup.sh --next`. Do the item of a
   session that it prints, tick its box in `checklist.md` when the item has no probe, and
   run the script again. Then give the operator the list of the items of J and of B, each
   with its fix. Never do an item of J: it needs a service, a secret or a press.
2. **A report.** `setup.sh` prints each item: done, missing (the owner and the exact
   command or click), or not checked. `--offline` uses no network.
3. **The monitor before work.** `bin/update-repo.sh` of the blueprint prints the report
   after each update. `resolve-run.sh`, the first act of each stage and lane, runs
   `setup.sh --gate`: a missing item with `block` stops the work with one line,
   `RESULT: STOP setup gap <id>: <fix>`. Tell the operator that line, and stop. A pass is
   kept one hour. The CI job `icm-check` prints each gap that a file shows as a warning.
4. **What blocks.** Only a gap that breaks the work: the router pointer of `CLAUDE.md`, a
   secret that a workflow of the template needs for each push, and with Postgres the script
   `vercel-build`. Each other gap is flagged.
5. **The ruleset is optional** (1.0.0-rc38). The operator decides for each repo if a
   ruleset requires the checks of CI. The item `gh.ruleset` is flagged with its fix, and
   never stops a run.
6. **Not checked.** A probe that cannot run (no `gh`, no network, no right to read, no
   keyring) says "not checked". It never blocks. The operator checks the item by hand.

## Outputs

- The report, and with `--gate` one `RESULT:` line.

## Gates

None. The operator does each item of J.
