# AGORA-008 · Photo ingestion: partners, cars, tours, weddings, testimonials

| | |
|---|---|
| Status | ready |
| Type | task |
| Priority | P1 |
| Size | S |
| Depends on | AGORA-005 (the rescued content this feeds) |
| Sources | .icm/docs/agorasim-info.pdf §2.1 (local only, gitignored) · `web/public/images/` |

## Problem

**Unblocked 27 Aug: the photos are in the repo** — `web/public/images/` now holds
~162MB of real imagery, organised by subject (`fleet/`, `rural-saloia/`,
`obidos-medieval-villages/`, `manzwine/`, `ramilo-wines/`, `testimonials/`,
`weddings/`, `wedding-awards/`, plus `logo.png` and `video.mp4`), landed in the
19 Aug "images" commit. The remaining work is **verification and wiring**: check
what the content files actually reference, fill every gap (partner pages reusing
generic car shots, the weddings "photographs on their way" tiles, Óbidos borrowing
the hero, faceless testimonials), and optimise. Note: no `tasco-galapito/` folder
exists — that bundle may genuinely still be missing; report rather than guess.

## Acceptance

- [ ] Audit: every image reference in `web/src/content/` resolved against
      `web/public/images/`; gaps listed in the PR.
- [ ] Oversized originals optimized (webp, sensible sizes) with honest alts.
- [ ] Partner experiences each get their own imagery (Galapito, Manzwine, Ramilo).
- [ ] Óbidos gets real route imagery.
- [ ] Weddings fleet: Renault 4L + VW T3 tiles filled; wedding shots where permitted.
- [ ] Testimonial photos added (permission was given).
- [ ] The 40 MB `public/video.mp4` question from AGORA-004 rechecked while in here.
- [ ] CI green.

## Prompt

Ingest the real Agorasim photos. Read .icm/intake/AGORA-008-photo-ingestion.md for
context — the content in web/src/content/ is already structured so images drop in
(fleet tiles render "photos coming" until an image path is set). Optimize everything,
keep PT/EN alts honest, never invent imagery attribution. Open a PR on a claude/
branch; no local checks — CI is the source of truth.
