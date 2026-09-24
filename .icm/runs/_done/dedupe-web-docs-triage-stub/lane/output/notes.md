# Chore: dedupe-web-docs-triage-stub

- invariant: no user-facing behaviour changed; only the triage backlog's file count differs (one
  stale duplicate removed)
- change: `.icm/intake/triage/knowledge-map-web-docs-deleted.md`: deleted. The stub's fix
  (`.icm/_shared/knowledge-map.md` dropping the deleted `web/docs/` pages) already shipped in
  PR #126, which also `git mv`'d the stub into `.icm/intake/triage/_done/`. The `main` takes UAT
  cutover batch (#130) reintroduced the pre-`_done/` copy at the triage/ root, byte-identical to
  the archived one; this run removes that stray duplicate.
- rollback: `git revert` this commit — restores the duplicate stub, no data or schema involved.
- learned: none
