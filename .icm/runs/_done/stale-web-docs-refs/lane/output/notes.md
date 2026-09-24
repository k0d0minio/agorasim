# Chore: stale-web-docs-refs

- invariant: behaviour unchanged; only comments and doc prose differ
- change: `.icm/_shared/project-rules.md` (two mentions of the deleted `web/docs/`
  admin-mobile-design-spec.md and guia-telemovel.md, replaced with a note that they were
  deleted in `6cbf0d4`, confirmed intentional); `web/src/components/admin/availability-calendar.tsx`,
  `web/src/components/ui/button.tsx`, `web/src/components/ui/dialog.tsx`,
  `web/src/components/ui/input.tsx`, `web/src/app/[locale]/layout.tsx` (dropped the dangling
  `docs/admin-mobile-design-spec.md §N` citations from doc comments, kept the plain rule
  description each comment was making)
- rollback: revert the commit; no data or schema involved
- learned: none

Out of scope, left untouched: `.icm/project.md` (the register — written by `/project` in
icm-board, never by a lane) and `.icm/intake/quote-flow/_done/admin-quote-builder.md` (an
archived run's historical source list, not live routing).
