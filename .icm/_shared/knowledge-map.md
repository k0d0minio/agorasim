# Knowledge map — what each stage reads, and where (Layer 3 routing, project-owned)

Project knowledge — **what Agorasim is, who it serves, how it is built** — is spread over three
homes in this repo, and this file is the router: it says which page each stage reads and writes,
so a stage loads a small, named slice instead of the whole repo. That scoping is the whole
payoff — **never load "all of `.icm/docs`"**, and never the `web/` tree "to be safe".

The docs tree is `.icm/docs` (`docs_path` in `.icm/project.json`). Every page named below in
backticks with a slash is checked by `.icm/scripts/validate-knowledge-map.sh` — it must exist
under `.icm/docs/`. One page of product knowledge lives **outside** that tree and is named in
prose (the validator would otherwise look for it under `.icm/docs/`): the facts of record in
workspaces/_config/business-facts.md. It is a page all the same — Release keeps it current, the
knowledge lane may edit it. The former web/docs pages — admin-mobile-design-spec.md and
guia-telemovel.md — were deleted in commit `6cbf0d4` (2026-09-18, confirmed intentional) and are
no longer routed here — the admin's design rules and the client's phone guide have no page of
record.

> The **direction of record** is the register, `.icm/project.md` — what the project is for, the
> business rules in the client's words, the Features table, the constraints, decisions `D1…`.
> `/project` in icm-board writes it; no stage does. Where a page below and the register disagree,
> the register wins and the page is the thing to fix (`knowledge edit`). A page that says a thing
> is not decided is the answer; a stage does not fill the gap by inventing one.

> Code conventions are **not** here — they stay canonical in `/AGENTS.md` § Conventions and
> the Next.js note in web/AGENTS.md. This map covers product direction, the client's words, operations and data
> protection only.

## Where the knowledge lives

### The client's own words — `.icm/docs/`

- icm-board `workspaces/deals/agorasim/agorasim-v1/raw/documents/2026-07-23-agorasim-proposal-platform-booking-commission.pdf` — the accepted
  proposal (23 Jul 2026): the six contracted features, §2.6 the three guest messages in the
  client's words, §5 the weddings deposit and balance terms. `pdftotext` it; quote it, never
  paraphrase a promise.
- icm-board `workspaces/deals/agorasim/agorasim-v1/raw/documents/agorasim-how-we-will-work-together-process-guide.pdf` — how the client and Jamie
  work: who decides what, how requests arrive, what a delivery looks like.
- icm-board `workspaces/deals/agorasim/agorasim-v1/raw/documents/agorasim-commission-and-payments-agreement.pdf` — the commission model (4% tours,
  6% weddings/events, minimum and cap, refunds pro-rata) as the client will sign it. Fees are on
  from the first booking by decision; the agreement is signed after.

### Operations and data — `.icm/docs/`

- `.icm/docs/launch-runbook.md` — the go-live choreography: the registrar transfer, Stripe
  Connect live, the Resend sending domain, the Production env, the €1 test. **Every checkbox is
  a human's** — a stage reads it, prepares and verifies, and never ticks one.
- `.icm/docs/data-protection.md` — the processors the site uses, the money model as the privacy
  policy states it, and the seven open legal items behind the policy's draft banner. Adding or
  removing a processor changes this table and the privacy content object (web/src/content/privacy.ts) in the same PR.
- `.icm/docs/admin-pt-inventory.md` — the admin's Portuguese: one word for one thing (reserva,
  pedido, sugestão, apagar …), the register, the rewrites. Any admin string is chosen from here.

### Product facts — outside the tree

- workspaces/_config/business-facts.md — the single source of truth for prices, cars, capacity,
  meeting points, departure times, contacts. Verbatim; never invent a price. Retired items
  (Olaria MZ) are listed so nobody reintroduces them.

## What each stage reads / writes

| Stage                     | Reads                                                                                                                                                                                                                                                                                                                                  | Writes                                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope** (incl. the cut) | may read everything — the register, the repo, the pages above — to check requirements are clear, nothing breaks, and the feature fits what exists; prefers the register's Intent and Business logic (who, why, the rules) and the proposal PDF for the client's own words                                                          | — (its artifacts are `.icm/runs/<slug>/01_scope/**` + `.icm/intake/<slug>/`)                                                                                                       |
| **Define**                | the register's Business logic and Decisions (the `D-n` a spec must honour); `.icm/docs/data-protection.md` when the change touches personal data or a processor; `.icm/docs/admin-pt-inventory.md` for any admin vocabulary; `/AGENTS.md` § Where do I go for `touches:`                          | —                                                                                                                                                                                  |
| **Build**                 | the code rules (`.icm/_shared/conventions.md` → `/AGENTS.md` § Conventions and web/AGENTS.md); business-facts for any fact that renders                                                                                                                                                              | —                                                                                                                                                                                  |
| **Release**               | the pages a shipped change makes stale: `.icm/docs/data-protection.md` (a processor or a data flow), business-facts (a fact), `.icm/docs/launch-runbook.md` (an ops step)                                                                                                                              | **updates** the affected page(s) in the same feature PR. No changelog in this repo (`.icm/_shared/project-rules.md` → Announcing)                                                          |
| **`knowledge` lane**      | this map, then only the page the request names                                                                                                                                                                                                                                                                                         | **adds / edits / removes** one page in a docs-only PR, and updates this map when a page was added or removed. The register is never its target — that is `/project`'s              |

Load only the page(s) named for the stage.

## Keeping this map current

- **Changing knowledge outside a Release** — `knowledge add|edit|remove "<what>"`
  (`.icm/lanes/knowledge/CONTEXT.md`) is the one sanctioned way: it routes to the page through
  this map, makes the change under the page's own conventions, updates the routing above when a
  page was added or removed, and opens a docs-only PR. A stage that finds a slice stale does not
  work from memory and does not patch the page inside its own PR.
- **The register is not a docs page.** A rule, a decision or a feature's state changes by
  re-running `/project agorasim` in icm-board, never by a lane.
- **Dead paths** — `.icm/scripts/validate-knowledge-map.sh` → `RESULT: OK | INVALID` checks
  that every backticked path this file names exists under `.icm/docs/`. The Pipeline workflow
  runs it, advisory, on any PR touching `.icm/docs/**` or this file; the `knowledge` lane runs it
  before opening its PR. The three out-of-tree pages are not checked by it — a stage that finds
  one missing says so.

## Also in `.icm/_shared/`

- `project-rules.md` — what is true of this repo: people and gates, the factory, announcing.
- `github.md` — the PR regimes, the GitHub calls, gates, and the label vocabulary.
- `ci.md` — what the checks are and what green means; how `ci-status.sh` reads them.
- `stage-preamble.md` — the one canonical "resolve the run or STOP" procedure.
- `scope-template.md` — the shape of the settled scope Scope writes.
- `conventions.md` — redirect to `/AGENTS.md` § Conventions and web/AGENTS.md (code rules).
