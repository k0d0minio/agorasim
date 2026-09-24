# Stub: The knowledge map still routes to the admin design spec and phone guide deleted from `web/docs/`

- lane: chore
- found-by: admin-quote-builder (Build) · 2026-09-23
- priority: P2

## Problem

Commit `6cbf0d4` ("update", 2026-09-18) deleted `web/docs/` — `admin-mobile-design-spec.md`,
`guia-telemovel.md` and the redesign screenshots. `.icm/_shared/knowledge-map.md` still names
both pages as the admin's design rules (Define, Build) and the phone guide Release must keep
current ("an admin change that alters what they see updates this page in the same PR"). The
validator does not check out-of-tree pages, so nothing flagged it. The quote-builder spec's
last criterion ("the phone guide describes the card") had no page to land on; Build did not
recreate a page the operator deleted.

## Proposed change

Run as `knowledge edit "the map: web/docs pages are gone"`. Decide first whether the deletion was
meant: if so, drop both pages from the map (or point the design rules at their last copy,
`git show 6cbf0d4^:web/docs/admin-mobile-design-spec.md`, moved under `.icm/docs/`); if not,
restore `web/docs/` and describe the Orçamento card in the phone guide.

## Prompt

In the agorasim repo, read `.icm/intake/triage/knowledge-map-web-docs-deleted.md`. Ask Jamie
whether deleting `web/docs/` in `6cbf0d4` was intended, then run `knowledge edit` accordingly
and `git mv` this stub to `_done/` in that PR.
