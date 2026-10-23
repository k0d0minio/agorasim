# Intake — the tickets, and the loop that ships them

`.icm/intake/` holds every ticket of this repo. A ticket is a markdown **stub**. The stub's
path is its identity. The stub's folder is its status. Nothing else records what is open,
done or dropped: no ticket numbers, no board file, no `TODO.md` (why: one home for the work,
in the repo where the work is · 2026-10-21).

This file is the whole contract. It stands alone: a session that reads only this file and
`CLAUDE.md` can take the next ticket to a merged pull request.

## Layout

```
.icm/scripts/
  new-run.sh             start a ticket: branch, stub into _done/, draft pull request
  close-out.sh           after the last stub: the epic folder into _done/
.icm/intake/
  CONTEXT.md             this contract
  README.md              one paragraph for a person who opens the folder
  <epic-slug>/           one folder per epic: related work, cut into order
    breakdown.md         what was understood, and the build order
    <feature-slug>.md    one stub per unit of work: one branch, one pull request
    _done/               stubs whose pull request merged
  triage/                one-off findings that belong to no epic
    <slug>.md            a bug, a tweak or a chore
    _done/
  _done/                 epics whose last stub merged, moved whole
```

Rules of the folder:

- **Identity is the path.** A ticket is `<epic-slug>/<feature-slug>` or `triage/<slug>`.
  Slugs are kebab-case. The `feature-slug` line in a stub equals its file name.
- **Status is positional.** A stub in its epic folder is open. A stub in `_done/` is done.
  Dropped work also moves to `_done/`, with a `> Dropped: <reason>, <date>` line at the top.
  Nothing is deleted.
- **The ticket line names the open path.** The pull request body's `ticket:` line is the
  stub's path when the ticket started: `.icm/intake/<epic-slug>/<feature-slug>.md` or
  `.icm/intake/triage/<slug>.md`. The line does not change when the file moves (why: the
  line is the ticket's identity, and a move changes the status, not the identity ·
  2026-10-22). A reader that resolves the line to a file looks in this order:
  1. The path as written. The stub is there on `main` while the pull request is open.
  2. The same path with `_done/` before the file name. The stub is there on the branch from
     its first commit, and on `main` after the merge.
  3. `.icm/intake/_done/<epic-slug>/_done/<feature-slug>.md`. The stub is there after
     close-out moves the epic.
  A `> Dropped:` first line marks a dropped stub in any `_done/`.
- **`main` is the only home.** The desk and every reader read this folder on `main`. A stub
  that is not pushed does not exist.
- **The pull request that ships a stub is the pull request that retires it.** The move to
  `_done/` is a commit on the ticket's branch. The merge makes it true.
- **A new plan becomes stubs here**, as an epic with a breakdown, never a loose list.

## The stub

```md
# Stub: <title, one line, what the user can do after this ships>

- feature-slug: <kebab, equal to the file name>
- epic: <epic-slug>
- story: <n>                   # when the epic comes from a user story
- sequence: <n> of <m>
- depends-on: <feature-slug, or none>
- complexity: low | medium | high | research
- priority: P0 | P1 | P2
- blocked: <reason>            # optional. Remove the line when the block lifts.

## Problem

<What is wrong or missing today. One to three sentences.>

## Proposed change

<What the build does, in the user's words. Not how.>

## Acceptance criteria

- [ ] <One observable result per line. The pull request copies these lines.>

## Out of scope

- <What this stub does not do.>

## Notes

<Decisions the build must keep. Files it will touch, when known. Optional.>
```

Required lines: the H1, `feature-slug`, `epic`, `sequence`, `depends-on`. The desk shows the
others when they are present. `complexity` decides the first gate (see The loop).

### The breakdown

`<epic-slug>/breakdown.md` is the epic's one review surface. Jamie reads it before any stub
is built. Edit it and re-cut the stubs to steer.

```md
# Breakdown: <epic title>

- epic-slug: <slug>
- story: <n>                   # when the epic comes from a user story
- source: <where the work came from: the proposal's scope, a call, a review, a user
  story: its number, its title, its author, its date and its link>

## What I understood

<Three to six sentences. A misread is caught here, before any cut.>

## Criteria → stubs

<Only when the epic comes from a user story. One row per acceptance criterion of the story,
in the story's order.>

| # | The story's criterion | Carried by |
|---|---|---|
| 1 | <the criterion, in the story's words> | `<feature-slug>` |
| 2 | <the criterion> | rule: README |
| 3 | <the criterion> | not built: <reason> |

## Build order

1. <feature-slug> — <one line> — depends-on: none
2. <feature-slug> — <one line> — depends-on: <feature-slug>

## Out of scope

- <What no stub covers this round.>
```

The build order is strict: sequences run `1..m` with no gap, every `depends-on` names a stub
sequenced earlier, and the order agrees with each stub's `sequence` line. The stubs that touch
shared files (the lockfile, the schema, the layouts) go first (why: every later stub merges
over them).

### The triage stub

Anything found that is not the current ticket's goes here, as one small stub, and the session
moves on. Never widen a pull request to absorb it. Never lose it in chat.

```md
# Stub: <title>

- lane: bug | tweak | chore
- found-by: <where> · <YYYY-MM-DD>
- complexity: low | medium | high | research
- priority: P0 | P1 | P2

## Problem

<Observed. One or two lines. File paths when known.>

## Proposed change

<One line, or "investigate".>

## Acceptance criteria

- [ ] <One observable result per line. The pull request copies these lines.>
```

No breakdown, no `sequence`, no `depends-on`. The acceptance criteria are required:
`new-run.sh` copies them into the pull request, and a stub without them gets one placeholder
line to fill by hand. The folder is a backlog, not a batch. Jamie prunes it. A session only
adds to it and consumes from it.

### A user story

A client's document that asks for work, a user story most often, follows one path from the
client's words to the stubs:

- **The story is the client's.** It lives in the client's Drive folder. It is never committed
  to the repo (why: the repo holds the work, the client holds their words, and a copy drifts
  · 2026-10-23).
- **One story becomes one epic.** The breakdown's `source:` line names the story: its number,
  its title in the client's language, its author, its date and its link. A `story:` line
  after `epic-slug:` carries the number (why: the client's list and the backlog read the
  same, and a reader goes from a stub to the story in one step · 2026-10-23).
- **`## What I understood` restates the story** in the session's words. Then it names what
  exists in the repo that the story replaces or reuses. Then it lists the questions, numbered,
  each with a default, under `### Questions for <the client>` and `### Questions for Jamie`
  (why: a misread is caught before any cut, and the client answers in one reply ·
  2026-10-23).
- **A table `## Criteria → stubs` lists every acceptance criterion of the story**, once, in
  the story's order, with the stub that carries it, or `rule: README` for a rule that binds the
  whole product, or `not built: <reason>`. Nothing the client wrote is lost silently (why: the
  client checks their own list against the table in one read · 2026-10-23).
- **Every stub of the epic carries `- story: <n>`** after `- epic:`. The line is absent when
  the epic has no story (why: the pull request, the stub and the story stay linked without a
  ticket number · 2026-10-23).
- **A story that only states rules for the whole product** becomes decisions of record in
  `README.md`, not an epic. The breakdowns name the decisions they rest on (why: a rule that
  binds every epic has one home, and an epic for it would never close · 2026-10-23).
- **`README.md` lists the stories in order** with their epic slug and state, so the client's
  list and the backlog read the same (why: the client asks "where is my story 12?" and the
  answer is one row · 2026-10-23).

## Writing rules

Every stub, breakdown and pull request body is technical text. Write it in Simplified
Technical English:

- Active voice. Simple tenses. One instruction per sentence. Sentences of 20 words or fewer.
- One word for one thing, used the same way every time.
- No semicolons. No phrasal verbs. No hedges removed: a "may" stays a "may".
- A list for any sequence of three or more steps or conditions.

A question for Jamie follows the same rules, and three more:

1. Number the questions. One question per line.
2. Give a default answer after each question. Write "Default: <answer>".
3. Make each question answerable with one word where that is possible.

Write the questions in the pull request body under `## Questions`, or in the breakdown under
`## What I understood`, and stop. Do not build on a guess (why: Jamie reads on a phone, and a
short numbered list with defaults is answered in one reply · 2026-10-21).

## The loop

One ticket is one branch and one pull request. A session runs the loop from `CLAUDE.md`. Two
scripts in `.icm/scripts/` do the git and GitHub mechanics of one step each. They decide
nothing, tick nothing and merge nothing (why: a script does the same thing every time and costs
no model turn, and the judgement stays with Jamie · 2026-10-21).

1. **Take the next stub.** Read `breakdown.md`, then the open stub with the lowest
   `sequence` whose `depends-on` is in `_done/`. A triage stub needs no order.
2. **Start it with the script.** `.icm/scripts/new-run.sh <epic>/<slug>` (or
   `triage/<slug>`) cuts the branch `<slug>` (or `triage/<slug>`) from `main`, moves the stub
   into its `_done/`, pushes, and opens the draft pull request from
   `.github/pull_request_template.md` with the ticket path and the acceptance criteria filled
   in. The move is a status mark, not a gate. The merge makes it true.
3. **Spec approved.** The script keeps the gate for a `medium`, `high` or `research` stub and
   drops it for a `low` stub or a triage stub. A stub whose `Notes` leave a decision open
   keeps the gate too: put the two lines back if the script dropped them. When the body
   carries the gate: write what you will build and your questions, push, and stop. Jamie
   ticks the box, then says "build". A missing anchor means "not required", never
   "unticked".
4. **Build the ticket.** Commit in Conventional Commits form. Push. CI is the verdict: never
   run build, lint, typecheck, test, format or dev locally. A red check: fix, commit, push,
   read again.
5. **Close out on the branch.** Park every off-ticket finding as a triage stub in the same
   pull request and list it under `Parked`. Then run `.icm/scripts/close-out.sh`: when an
   epic has no open stub left and no sibling pull request is open, it moves the epic folder
   into `.icm/intake/_done/` and commits. Push.
6. **Finish the body, then flip the pull request to ready** when CI is green and the
   preview exists. Before the flip:
   - Set the title in Conventional Commits form, for example `chore(env): declare NODE_ENV
     in .env.example`. The script opens the pull request with the stub's title as it is
     (why: the squash merge makes the title the commit on `main`, and release-please reads
     that commit · 2026-10-22).
   - Put the preview URL on the `preview:` line. The preview URL is the deployment's branch
     alias, `<project>-git-<branch>-<team>.vercel.app`. The vercel[bot] comment on the pull
     request links it as Preview. The Vercel commit status links the inspector page, not
     the preview.
   - Fill `What changes` and `How to test`. Delete `Questions` when there is none. Write
     `None` under `Parked` when the pull request adds no stub.
   Tick nothing. Stop. Your last message names the pull request and says what waits on
   Jamie.
7. **Jamie tests the preview**, ticks **Ready to merge**, and merges. A session never merges
   and never ticks a gate (why: the gate is where Jamie's judgement enters ·
   2026-10-21). Where `.icm/uat/CONTEXT.md` exists, the merge reaches the UAT environment,
   and production moves on the promotion that contract describes.

Gates are human checkboxes. Read them. Never tick them.
