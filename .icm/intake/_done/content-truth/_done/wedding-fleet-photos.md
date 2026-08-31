# Stub: The missing wedding-fleet photos — chase, then wire

- feature-slug: wedding-fleet-photos
- epic: content-truth
- priority: P2
- size: S
- depends-on: none
- sequence: 6 of 7
- sources: copy lens: PR #30 keeps `image: null` for Renault 4L and VW T3 → "Fotografias
  a caminho" tiles (**stale for the 4L** — see audit); info PDF §2.1 (client already sent
  WeTransfer links — likely expired: they last days, sent 2026-08-18)

## Problem

The weddings page (landing via booking-live) will still show "photographs on their
way" for part of the fleet. The client's WeTransfer links from August have almost
certainly expired; the assets may exist on Jamie's disk from the original download —
check before asking.

## Audit — 2026-08-31

`web/public/images/{weddings,fleet}/` swept against the folder README. Half the
original premise was already stale:

**Renault 4L — present, already wired. Not blocked.**
`weddings/renault-4-mafra-palace.jpg` (156 KB, 1015×1024 — garlanded 4L in front of
Mafra National Palace) is live in the `renault-4l` fleet tile, and has been since
`af2baef` (2026-08-19), carried through the PR #30 rescue in `768bcc4`. A second
usable wedding frame sits spare: `weddings/renault-4-rear-name-sign.jpg` (164 KB,
1024×1015 — rear, garland, couple's name sign). Both are under the 500 KB bar. So the
4L needs nothing from the client, and the tile is not a `photosSoon` tile.

**VW T3 — genuinely absent. Still blocked.**
Four T3 frames exist, all in `fleet/`, all tour/brand context, none wedding:
`vw-t3-van-and-2cv-vineyard-road.jpg`, `vw-t3-van-dog-at-window.jpg`,
`vw-t3-van-doors-open.jpg`, `vw-t3-van-front.jpg` (plus
`rural-saloia/guests-at-vw-van-dusk.jpg`). No garland, no couple, no ceremony in any
of them. Dropping one into "Escolha o vosso clássico" beside three garlanded wedding
frames would sell an undecorated tour van as a wedding car — the exact "never a wrong
car" trap the tile comment in `weddings.ts` guards against. So the T3 tile stays
`photosSoon` and no code changed this pass.

The re-request is on the client pack: `.icm/project.md` → Open questions → Client,
"Photos re-send … blocks `content-truth/wedding-fleet-photos`", riding
`workspaces/deals/diogo-rita/open-questions.md` in icm-board (that repo is outside
this one; the register bullet here is the in-repo record). Both have been narrowed to
the T3. Pack still unsent — Jamie sends.

## Proposed change

When the T3 wedding photograph lands: optimise (<500 KB), place in
`web/public/images/weddings/` under the folder naming rule (`vw-t3-van-…`), add it to
the `vw-t3` entry in `web/src/content/weddings.ts`, and update the folder README's
`weddings/` table. That empties the last `photosSoon` tile; the `photosSoon` string
and its branch in `casamentos/page.tsx` can then go too.

## Acceptance criteria (rough)

- [x] Renault 4L photographed on /casamentos
- [ ] VW T3 photographed on /casamentos; no "photographs on their way" left
- [ ] `photosSoon` string and its render branch removed once the last tile is filled
- [x] Images optimised (<500KB source), real alt text — holds for what is wired today
- [ ] CI green

## Resolution — 2026-08-31

Closed by substitution, on Jamie's explicit call after the block was re-confirmed.

The client's wedding-context T3 frame never arrived: the 2026-08-18 WeTransfer links
are long expired, the re-request pack was still unsent, and a fresh sweep this session
found nothing new in `weddings/`, nothing untracked, and nothing on disk. All four
`fleet/` T3 frames were opened and confirmed tour context — van alone on cobbles, rear
hatch open in a car park, drone shot with the 2CV on a vineyard lane, the dog at the
window at dusk. No garland, no couple, no ceremony in any of them.

Rather than ship a fourth tile reading "Fotografias a caminho" indefinitely, the
least-misleading frame was used: `fleet/vw-t3-van-front.jpg`, cropped square on the van
and optimised to `weddings/vw-t3-van-front-square.webp` (1024×1024, 229 KB). It is a
clean three-quarter portrait — no guests, no tour paraphernalia, no second car — so it
reads as "this is the vehicle", which is what a fleet-choice tile has to do. The
section's own copy already promises the car arrives decorated ("todos chegam impecáveis
e decorados a rigor"), so the tile identifies the car and the copy carries the garland.

**The trade-off, stated plainly:** this is the substitution the stub above argued
against, and that argument was not wrong. Beside three garlanded wedding frames the
undecorated van is the weakest tile on the page, and a couple could read it as the car
arriving as-is. The risk was accepted deliberately in exchange for retiring the
placeholder. The caveat is recorded where the next maintainer will meet it — the `cars`
doc comment in `web/src/content/weddings.ts` and the `weddings/` row in
`web/public/images/README.md` — both saying to swap the frame the day a garlanded one
lands.

**Still worth chasing, no longer blocking:** a real wedding photograph of the T3. It is
a content upgrade now rather than a ticket dependency, so it rides the client pack as a
plain request — `.icm/project.md` → Open questions → Client.

## Prompt

In the agorasim repo (`web/`), finish the wedding fleet imagery per
`.icm/intake/content-truth/wedding-fleet-photos.md`. Only the **VW T3** is
outstanding — the Renault 4L is already wired (see the audit in that file). If a
wedding-context T3 photograph has arrived, optimise it, place it in
`web/public/images/weddings/`, wire it into the `vw-t3` entry in
`web/src/content/weddings.ts`, add its row to `web/public/images/README.md`, and
remove the now-dead `photosSoon` string plus its branch in
`web/src/app/[locale]/casamentos/page.tsx`. Do not substitute a tour-context T3 shot
from `fleet/`. If it still has not arrived, leave this stub blocked. PR on a
`claude/` branch; no local checks — CI is the source of truth.
