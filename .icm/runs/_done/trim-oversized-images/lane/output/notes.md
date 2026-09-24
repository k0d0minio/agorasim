# Chore: trim-oversized-images

- invariant: no user-facing behaviour changed; only the bytes of committed images and one
  AGENTS.md note differ. Every remaining `web/public/images/*` reference resolves to the same
  file at the same path and dimensions.
- change: `web/public/images/fleet/vw-t3-van-dog-at-window.jpg` and
  `web/public/images/rural-saloia/guests-at-vw-van-dusk.jpg` deleted (44.4 MB combined) —
  referenced nowhere under `web/src`, confirmed via `grep` and via `SELECT ... FROM experiences
  WHERE image ILIKE '%<file>%'` against both the production (`nameless-sea-98952497`) and
  non-prod (`lingering-frog-97017403`) Neon projects, both empty. The nine remaining images over
  3 MB re-encoded in place (JPEG, `optimize`+`progressive`, quality stepped down from 90 until
  under 3 MB) at unchanged dimensions — 27.4 MB → 20.3 MB combined. `web/AGENTS.md` gets one new
  section naming the committed-image bar (`EXPERIENCE_IMAGE_MAX_BYTES`, ~5 MB) so future commits
  don't reintroduce oversized files. `web/public/images` total: 161 MB → ~112 MB.
- rollback: revert the commit — the two deleted files and the original encodes come back from
  git history; nothing else (schema, env) changed.
- learned: none
