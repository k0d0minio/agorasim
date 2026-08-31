# Stub: 162 MB of images in git — curate, compress, or relocate

- lane: chore
- found-by: tech lens · 2026-08-29
- priority: P2

## Problem

`web/public/images` totals ~162 MB (repo ~224 MB): referenced covers run 2–4.5 MB
source each, and at least four files with zero references include a 23 MB and a
21 MB original (`fleet/vw-t3-van-dog-at-window.jpg`,
`rural-saloia/guests-at-vw-van-dusk.jpg`, `fiat-600-countryside.jpg`,
`weddings/2cv-groom-driving-cobbled-lane.jpg`). Every clone and deploy carries it
all; multi-MB sources cost the image optimizer.

## Proposed change

With Jamie's call on intent (raw material for the GEO/social workspaces vs
leftovers): compress referenced sources to sensible web originals (≤500 KB), move
keep-worthy unreferenced originals out of git (Vercel Blob or local archive), delete
the rest. Update `web/public/images/README.md` to match. Note: several currently
unreferenced photos become referenced by content-truth stubs (testimonials wiring,
Óbidos swap) — run this after that epic settles.

## Prompt

In the agorasim repo (`web/`), run the image audit per
`.icm/intake/triage/image-audit.md`. The content-truth epic has settled (archived
2026-08-31 to `.icm/intake/_done/content-truth/`), so its stubs' photos are wired and
referenced now — read that epic before deleting anything it put on the page. Build
the referenced-vs-unreferenced list from `web/src` greps, propose the
keep/compress/delete split to Jamie before deleting anything (his photos, his
call), compress referenced sources, and update `web/public/images/README.md`. PR on
a `claude/` branch; no local checks — CI is the source of truth.
