# Stub: No code comment cites a decision number that has no home

- lane: chore
- found-by: PR #245 (triage/register-decisions), its stop report, Jamie · 2026-10-30
- complexity: low
- priority: P2

## Problem

About 50 comments in 36 files under `web/` and `workspaces/` cite a decision by number, for example `(D9)`, `(D24)` or `register D18`. The numbers belonged to the project register `.icm/project.md`. PR #245 removed the numbers: `.icm/intake/README.md` § Decisions holds the rules with no ID. So each citation points at nothing.

## Proposed change

Change each citation to point at a rule that exists, or to state the fact itself. Behaviour does not change: comments only.

- A number of a rule in force (D4, D5, D7, D8, D9, D10, D11, D12, D13, D14, D19, D22, D23, D24, D25): replace it with `.icm/intake/README.md` § Decisions, or with the rule in a few words.
- A number of a rule that was not restored (D3, D18 and the others): state the fact with its date, or remove the citation. Read the old rule with `git show 5c8eef6^:.icm/project.md`.
- `D2` and `D3` in the admin components (`availability-calendar.tsx`, `pagination.tsx`, `admin-nav.ts`: "the 320px reflow floor", "spec D2/D3") are not register numbers. They name decisions of the admin mobile design spec `web/docs/admin-mobile-design-spec.md`, and that file is not on `main`. State the rule itself: the 320px reflow floor, the 44px targets.
- `web/src/content/terms.ts` § `legalOpenItems`: two `TODO(legal)` strings name "decisão D9" and "decision D9". The list is never rendered. Change the words in the strings only.

Find the citations with:

```
git grep -n -I -P "(?<![A-Za-z0-9_#-])D([1-9]|1[0-9]|2[0-7])(?![0-9A-Za-z_])" -- web workspaces
```

## Acceptance criteria

- [ ] The command above finds no citation of a decision number under `web/` or `workspaces/`.
- [ ] Only comments, the `legalOpenItems` strings and `workspaces/_config/business-facts.md` change. No rendered text and no code changes.
