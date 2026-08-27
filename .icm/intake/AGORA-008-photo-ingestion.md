# AGORA-008 · Photo ingestion: partners, cars, tours, weddings, testimonials

| | |
|---|---|
| Status | ready |
| Type | task |
| Priority | P1 |
| Size | S |
| Depends on | AGORA-005 (the rescued content this feeds) |
| Sources | .icm/docs/agorasim-info.pdf §2.1 · `web/public/images/` |

## Problem

**Unblocked 27 Aug: the photos are in the repo** — `web/public/images/` now holds
~162MB of real imagery, organised by subject (`fleet/`, `rural-saloia/`,
`obidos-medieval-villages/`, `manzwine/`, `ramilo-wines/`, `tasco-galapito/`,
`testimonials/`,
`weddings/`, `wedding-awards/`, plus `logo.png` and `video.mp4`), landed in the
19 Aug "images" commit. The remaining work is **verification and wiring**: check
what the content files actually reference, fill every gap (partner pages reusing
generic car shots, the weddings "photographs on their way" tiles, Óbidos borrowing
the hero, faceless testimonials), and optimise — the worst offenders are stills
served straight from `public/` (23MB `fleet/vw-t3-van-dog-at-window.jpg`, 21MB
`rural-saloia/guests-at-vw-van-dusk.jpg`, several at 3–5MB). Corrections from the
2026-08-27 audit: `tasco-galapito/` **did** land (12+ photos, referenced from
`experiences.ts`), and `video.mp4` is already 3.1MB — the 40MB question from
AGORA-004 is resolved.

## Acceptance

- [ ] Audit: every image reference in `web/src/content/` resolved against
      `web/public/images/`; gaps listed in the PR.
- [ ] Oversized originals optimized (webp, sensible sizes) with honest alts.
- [ ] Partner experiences each get their own imagery (Galapito, Manzwine, Ramilo).
- [ ] Óbidos gets real route imagery.
- [ ] Weddings fleet: Renault 4L + VW T3 tiles filled; wedding shots where permitted.
- [ ] Testimonial photos added (permission was given).
- [ ] CI green.

## Prompt

Ingest the real Agorasim photos. Read .icm/intake/AGORA-008-photo-ingestion.md for
context — the content in web/src/content/ is already structured so images drop in
(fleet tiles render "photos coming" until an image path is set). Optimize everything,
keep PT/EN alts honest, never invent imagery attribution. Open a PR on a claude/
branch; no local checks — CI is the source of truth.
