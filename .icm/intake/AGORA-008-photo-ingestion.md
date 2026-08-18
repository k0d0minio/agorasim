# AGORA-008 · Photo ingestion: partners, cars, tours, weddings, testimonials

| | |
|---|---|
| Status | blocked |
| Type | task |
| Priority | P1 |
| Size | S |
| Depends on | AGORA-005 (content landed photo-ready) |
| Blocked by | The photo files — the WeTransfer links in Diogo & Rita's answers expired before ingestion; re-request or recover from Jamie's downloads |
| Sources | .icm/docs/agorasim-info.pdf §2.1 (local only, gitignored) |

## Problem

AGORA-005 landed all launch content photo-ready, but the photos themselves never made
it into the repo: the seven WeTransfer bundles in the info PDF (Rural Saloia, Óbidos,
Ramilo, Manzwine, Galapito, weddings, classics) plus the testimonial photos link had
expired. Today the partners reuse generic car shots, the weddings page shows two
"photographs on their way" tiles (Renault 4L, VW T3), Óbidos borrows the hero image,
and the testimonials render without faces.

## Acceptance

- [ ] Photo bundles obtained (re-request via WhatsApp or recover local downloads).
- [ ] Optimized (webp, sensible sizes) into `web/public/images/` with honest alts.
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
