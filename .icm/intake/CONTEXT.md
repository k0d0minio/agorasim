# Intake — the batch formats, triage, and the archive rules

`.icm/intake/` holds the sequenced batches of feature **stubs** that `/pipeline new` walks into
Define — one folder per scope, one stub per future run / future PR — plus the `triage/` parking
lane. This file owns the **formats** (breakdown and stub), the **triage** shape, and what happens
**after the batch**. How a batch is cut — the seams, the build order, `validate-intake.sh` — is
the Scope stage's job and lives in `.icm/stages/01_scope/CONTEXT.md` (step 6). There is no
`/pipeline decompose` subcommand; the cut is the last thing Scope does.

The stub folder is the only state (no branch or PR of its own); Scope pushes it to `main` with
`scope.md`. Re-cutting after the human edits `breakdown.md` regenerates the stubs. **Every scope
gets an intake folder, however small** — a single-PR scope gets exactly one stub whose
`feature-slug` is the scope slug itself.

One audit may write here too, where the repo ships one (`_shared/project-rules.md` → Capability
skills): a codebase-audit skill fired daily by a Claude Routine parks **at most one** finding a day
in `triage/` — the triage stub shape below, `found-by: codebase-audit · <date>`, on its own
one-file PR — and never cuts an epic of its own. There is no story and no `scope.md` behind it; a
quiet day writes nothing.

**`.icm/intake/triage/` is the third resident** — the parking lane for off-ticket findings, with
its own lighter stub shape (see **Triage** below). It is a permanent backlog folder, not an epic:
no breakdown, no sequence, never walked by `/pipeline new`, never archived.

## Formats

`.icm/intake/<scope-slug>/breakdown.md` — the single review surface:

```md
# Breakdown: <scope title>

- scope-slug: <slug> · story: runs/<slug>/01_scope/\_source/story.md
- initiative: <name> / objective: <current-Q objective>
- personas: <from the repo's persona vocabulary — `personas` in .icm/project.json>

## What I understood

<3–6 sentences restating the intent — so a misread is caught before the cuts>

## Where it sits

<the journey step(s) + entity(ies) this touches, named as the knowledge map's pages name them>

## Build order

<The exact order `/pipeline new` walks — a strict total order, one stub per line.>

1. <feature-slug> — <one line> — depends-on: <none / other feature-slugs>
2. <feature-slug> — <one line> — depends-on: <…>

## Parallelizable

<Optional — the dependency shape behind the linear order. Omit if a plain chain.>

## Out of scope (whole scope)

- <carried from `scope.md` — what no stub covers this round>
```

`.icm/intake/<scope-slug>/<feature-slug>.md` — one per feature. The **handoff contract**:
fields map mechanically onto Define's `spec.md`.

```md
# Stub: <feature title>

- feature-slug: <kebab>
- scope: <scope-slug>
- personas: <from the repo's persona vocabulary>
- initiative: <name> / objective: <current-Q objective>
- depends-on: <other feature-slugs, or none>
- sequence: <n of m> # what `/pipeline new` reads to find "next"

## Problem

<one-liner → seeds the spec's Problem; connect to the objective it advances>

## Proposed change

<what we'll build, functionally — not implementation detail>

## Acceptance criteria (rough)

- [ ] <observable, testable outcome>

## Out of scope (this feature)

- <things this feature explicitly won't do>

## Notes for Define

<scope-level decisions Define must honour (name the `D-n` behind each) and any point left under
`## Open for Define` in scope.md that lands here; optional `touches:` guess>
```

The order invariants — `sequence` unique and contiguous over the whole batch (`_done/` included),
`of m` matching the stub count, every `depends-on` naming an in-batch stub sequenced first,
`## Build order` and the stubs' `sequence:` agreeing — are checked by
`.icm/scripts/validate-intake.sh <scope-slug>` → `RESULT: OK`. Scope runs it before pushing; a
repo whose CI re-runs it advisorily on any PR touching `.icm/intake/**` (`_shared/project-rules.md`
→ The factory says whether this one does) is what catches a later hand-edit to `breakdown.md`.

## Triage — the parking lane (`.icm/intake/triage/`)

The pipeline's rule for anything found that is **not the current ticket's** — a review finding
Release won't fix pre-merge, a wart Build steps around, a paper cut anyone spots in passing — is:
**park it here as one small stub and move on.** Never widen a PR to absorb it, never lose it in a
conversation. Writing the stub costs a minute; that is the whole point.

`.icm/intake/triage/<kebab-name>.md`:

```md
# Stub: <title>

- lane: bug | tweak | chore
- found-by: <run slug / review / audit / conversation> · <YYYY-MM-DD>

## Problem

<observed, one or two lines; file paths if known>

## Proposed change

<one line — or "investigate", if the fix isn't obvious>
```

Rules of the folder:

- **No breakdown, no `sequence:`, no `depends-on`** — it is a backlog, not a batch.
  `validate-intake.sh` checks only that each stub carries a valid `lane:` line.
- **Consumed by the lanes, not by `new`**: `/pipeline bug|tweak|chore <stub-name>` resolves the
  stub, pre-seeds the lane from it, and `new-run.sh --stub` moves it to `triage/_done/`.
- An entry nobody will ever pick up is deleted, not hoarded — the human prunes, the agent only
  adds and consumes (`triage prune` below lists the candidates; it never deletes).
- The folder itself is **never archived**: `close-out.sh` skips it in the epic scan even when it
  is empty.
- **Cap: 60 active stubs** (top-level `.md` files; `_done/` does not count). Over the cap, every
  stage or lane that parks a finding says so in its stop message — one line,
  `triage/ holds N active stubs (cap 60) — run triage report` — and `triage report` is the
  suggested next command. The cap changes nothing else: the finding is still parked (a PR is
  never widened to dodge the notice), the lanes still consume, `new` still never reads the
  folder. The number lives here; `triage-report.sh` carries it as its `--cap` default and prints
  the verdict.

### Managing the backlog — `triage report | batch | prune`

The folder has one reader of its own, `.icm/scripts/triage-report.sh`, and three verbs on the
router (`.claude/skills/pipeline/SKILL.md` → Resolving `triage`). None of them opens a run or a
PR; `batch` writes an intake epic, the others only read.

- **`triage report`** — runs `.icm/scripts/triage-report.sh` and shows its markdown: active and
  `_done/` counts against the cap, counts by lane, by found-by source (which Release review
  pass, Build, a lane, an audit), by area (the `apps/<app>` / `packages/<pkg>` / `.icm` /
  `.github` / `.claude` paths each stub cites) and by age (days since the found-by date, with
  the over-30-days names listed), then the near-duplicates: titles sharing four or more
  significant words, and stubs citing the same `file:line`. Deterministic — same folder, same
  `--today`, same output; last line `RESULT: OK — …`. Read it before `batch` or `prune`, and
  whenever a stop message says the folder is over its cap.
- **`triage batch <area|lane> "<epic-title>"`** — the way findings leave this folder as a
  **planned** batch instead of one lane PR at a time. The selector is an area from the report
  (`apps/<app>`, `packages/<pkg>`, `.icm`, `.github`, …) or a lane (`bug` / `tweak` / `chore`).
  The agent reads every matching active stub, **drops the duplicates first** — each superseded
  stub is `git mv`'d to `_done/` with a line added under its `found-by:`,
  `- superseded-by: <surviving-stub>.md — <why>` — then cuts the survivors into a normal intake epic
  `.icm/intake/<epic-slug>/` (slug from the title) with `breakdown.md` and sequenced stubs in the
  **Formats** above: one feature stub per shippable unit, grouping several small findings where
  one PR would fix them together, `feature-slug` fixed at the cut, `depends-on` where a fix rests
  on another, `sequence: n of m`. The originals move to `triage/_done/` with a
  `- superseded-by: <epic-slug>/<feature-slug>.md` line, so the report stops counting them and
  the trail survives. Then `.icm/scripts/validate-intake.sh <epic-slug>` → `RESULT: OK`, and
  the agent **stops** — the epic is the review surface; `new` walks it once the human has read
  `breakdown.md`. There is no story and no `scope.md` behind such an epic; the `story:` slot of
  `breakdown.md`'s header line reads
  `none — cut from triage/ by triage batch <selector>`. A `batch` that finds product decisions inside a stub leaves
  that stub in place and says so; it does not decide.
- **`triage prune`** — lists, for the human, the stubs older than 30 days (found-by date) and
  the ones that look superseded: a title sharing four or more significant words with another
  stub, the same `file:line` cited elsewhere, or a body naming a run or PR that has since
  merged. One line per candidate — name, age, the reason — and the exact `git rm` for each.
  **It never deletes.** The human confirms name by name; the agent then runs only the deletions
  confirmed, in one commit, and nothing else. A candidate that is a duplicate rather than dead
  is better retired with a `superseded-by:` line into `_done/` (as `batch` does) than removed.

## After the batch

`/pipeline new` consumes stubs one at a time into `_done/`. When the last stub has been spun out
**and** every one of those runs has merged, the epic folder is archived to the intake archive
(`intake_archive` in `.icm/project.json`; `.icm/intake/_done/` by default) under
`<scope-slug>/` — breakdown, `_done/` stubs and `_source/` intact. `.icm/intake/` therefore holds
only epics with work left in them.

**`_done/` alone is not the signal: it means spun out, not shipped** — the two ends of a stub's
life sit in different stages. Define moves it into `_done/` when the run opens (`new-run.sh
--stub`); the epic is archived by `.icm/scripts/close-out.sh`, run on the branch by the Release
that merges the batch's final run, which is why the script re-checks each sibling's PR rather than
trusting the folder. That final run is excluded from its own sibling check — it is the one merging
now, and its merge is what publishes the epic's move. Neither end is a later cleanup pass.
