# AGORA-005 · Content & weddings: rescue the stranded PR #30 onto main

| | |
|---|---|
| Status | ready |
| Type | fix |
| Priority | P0 |
| Size | S |
| Blocked by | — nothing; the work is written, it just never reached `main` |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 4 |

## Problem

**This work was completed on 2026-08-18 and never reached `main`** (content confirmed
current by Jamie, 2026-08-27). Commit `b138aa0` ("AGORA-005: weddings live with the
real offer, cars by name, testimonials, awards", 653 insertions across 10 files) was
merged by **PR #30 into `claude/agora-002-full-booking-model`** — but PR #29 had
already merged that branch into `main` two hours earlier, so PR #30's content fell off
the end. GitHub shows PR #30 as MERGED; production has none of it. Verify:
`git merge-base --is-ancestor b138aa0 main` fails; the commit exists only on
`origin/claude/agora-002-full-booking-model` and `origin/claude/agora-005-content-weddings`.

Missing from `main`: `/casamentos` flipped live in `routes.ts`, the real weddings offer
in `weddings.ts` (quote-per-event, §2.3), `testimonials.ts` with the three §2.5 guest
quotes, the four car biographies in `site.ts` (Josefina 2CV '86, Catrel 4L '89,
Cerejinha Fiat 600 '70, Caravela T3 '88), `wedding-quote-form.tsx` + its server action,
and the Wedding Awards badge strip. The same commit also `git mv`'d this ticket to
`_done/` — which is why the board and the PR list disagree; this file on `main` is the
true state.

## Acceptance

- [ ] `b138aa0` landed on `main` via a fresh PR from a `claude/` branch (cherry-pick,
      or merge the stranded branch), conflicts resolved against current `main`.
- [ ] `/casamentos` live in `routes.ts`; weddings offer, car stories, testimonials and
      awards render on the Vercel preview; PT/EN parity (`Localized<T>`).
- [ ] Real photos now exist under `web/public/images/` (weddings, testimonials,
      fleet) — wire them where the rescued content expects images, or leave tiles
      degrading gracefully for AGORA-008 to finish.
- [ ] This ticket file `git mv`'d to `_done/` in the same PR.
- [ ] CI green.

## Prompt

Rescue stranded work in the agorasim repo. Commit b138aa0 ("AGORA-005: weddings
live…") was merged by PR #30 into claude/agora-002-full-booking-model AFTER that
branch had already been merged to main, so main never received it. Read
.icm/intake/AGORA-005-content-and-weddings.md for the file list, cherry-pick or merge
b138aa0 onto a fresh claude/ branch off main, resolve conflicts, verify /casamentos
goes live per the acceptance boxes, move this ticket to .icm/intake/_done/ in the same
PR, and open the PR. Do not run local checks — CI is the source of truth.
