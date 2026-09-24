# Stub: Two 22 MB JPEGs nothing references, and 161 MB of images in every checkout

- lane: chore
- found-by: tech lens (/project) · 2026-09-18
- priority: P2

## Problem

`git ls-tree -r -l HEAD -- web/public/images` → 161 MB across 93 files;
`fleet/vw-t3-van-dog-at-window.jpg` (22.4 MB) and `rural-saloia/guests-at-vw-van-dusk.jpg`
(21.0 MB) are referenced nowhere under `web/src`; every CI checkout and Vercel build pulls
all of it. Uploaded photos are capped at 5 MB (`experience-images.ts:35`); committed ones
dodge that bar. A Neon `experiences.image` row could still point at the two paths
(`isLegacyImagePath` accepts any `/images/...`) — Jamie checks before deleting (register
question).

## Proposed change

Delete the two unreferenced files once the DB check is clear; re-encode the ten files over
3 MB; a note in `web/AGENTS.md` on the committed-image bar.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/oversized-images-in-git.md`. First
confirm with Jamie that no `experiences.image` row points at the two paths. Then remove
them, re-encode the >3 MB set at the same dimensions, and record the bar. `git mv` the stub
to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
