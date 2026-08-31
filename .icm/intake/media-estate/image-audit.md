# Stub: 162 MB of images in git — curate, compress, relocate

- feature-slug: image-audit
- epic: media-estate
- priority: P2
- size: M
- depends-on: seeded-media-dead-paths, wedding-awards-badges
- sequence: 3 of 3
- sources: tech lens 2026-08-29 (`web/public/images` ≈162 MB of a ≈224 MB repo;
  2–4.5 MB referenced covers; a 23 MB and a 21 MB unreferenced original)

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
the rest. Update `web/public/images/README.md` to match.

The referenced-vs-unreferenced list is only true once its predecessors have settled,
which is why this is last: `seeded-media-dead-paths` is about to point catalogue rows
at photographs that read as unreferenced today, and `wedding-awards-badges` decides
whether five badges are published or deleted. Build the list after them, not before —
a grep of `web/src` alone will not see the rows.

The third gate is gone: `content-truth/wedding-fleet-photos` closed 2026-08-31 and its
epic archived, so the photo it wires is referenced now. One thing it leaves for this
stub: `weddings/vw-t3-van-front-square.webp` is a committed derivative of
`fleet/vw-t3-van-front.jpg`, so the source can be compressed or relocated on its own
merits — the page does not read it.

## Prompt

In the agorasim repo (`web/`), run the image audit per
`.icm/intake/media-estate/image-audit.md`. Verify first that its two in-epic
predecessors have landed (`seeded-media-dead-paths`, `wedding-awards-badges`) — both
wire currently-unreferenced photos, and this is the only destructive stub in the
backlog. The content-truth epic has already settled (archived 2026-08-31 to
`.icm/intake/_done/content-truth/`), so its photos are wired. Build the
referenced-vs-unreferenced list from `web/src` greps **and the live catalogue rows**,
propose the keep/compress/delete split to Jamie before deleting anything (his photos,
his call), compress referenced sources, and update `web/public/images/README.md`. PR
on a `claude/` branch; no local checks — CI is the source of truth.
