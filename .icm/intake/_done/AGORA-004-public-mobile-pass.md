# AGORA-004 · Public-site mobile pass

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 3 |

## Problem

The public site never got the mobile pass the admin got: no `viewport` export, unaudited at
phone width, and `public/video.mp4` is 40 MB on the mobile critical path. The admin is the
reference standard (`web/src/app/admin/layout.tsx`, `web/docs/admin-mobile-design-spec.md`).

## Acceptance

- [x] Proper `viewport` export on the public layout (mirror the admin's, incl. `dvh`).
- [x] Video compressed hard (~2–4 MB) or a static poster served on mobile; before/after
      sizes recorded. **Both:** 40.9 MB → 3.2 MB, and phones get the poster only.
- [x] Every launch route audited at 390×844: tap targets, sticky book CTA, header/nav,
      form usability, image sizes.
- [x] Lighthouse mobile run on home, `/experiencias`, `/reservar`; worst offenders fixed,
      scores recorded.
- [ ] CI green.

## Results

Measured on a production build (`next build` + `next start`), headless Chromium at
390 × 844 and 320 × 568, mobile emulation.

**Video.** `public/images/video.mp4` 40.9 MB → **3.24 MB**: 1920×1080@60 → 1280×720@30,
two-pass H.264 ≈ 780 kbps, audio track dropped (the element is `muted`). It is also no
longer requested below 768px — phones render the poster alone — so the mobile critical
path loses the file entirely, not just 37 MB of it.

**Page weight, home page, Lighthouse mobile:** 2.19 MB → **0.97 MB** (median of 3). The
baseline figure is itself an undercount: the trace ends while the 40 MB video is still
streaming, so a real phone kept downloading after Lighthouse stopped counting.

**Category scores** (home, `/experiencias`, `/reservar`): accessibility **100**,
best-practices **100**, SEO **100**, before and after. The performance *score* is too
noisy on shared CI-grade hardware to report as a delta — 64/90/91 before, 79/79/90 after,
same three URLs, same run — so page weight above is the trustworthy number. Two real
offenders were found and fixed: the video competing with the LCP image, and the `<video
poster>` attribute re-fetching the hero photo unoptimised (353 KB, on top of the
`next/image` copy of the same file).

**Layout shift.** CLS 0 on every branch run. A 0.43 outlier appears intermittently on
*both* branch and baseline (1 run in 3, footer attributed) — pre-existing and not
introduced here; worth its own look if it shows up in field data.

**Tap targets.** Every launch route, both widths, no page-level horizontal scroll at 320px.
Fixed to the 44px floor: language toggle, footer link lists, footer social icons, contact
page phone/email links, the `/experiencias` "learn more" link, and the `/reservar` add-on
rows. Remaining sub-44px hits are verified non-issues: experience cards (the whole
358×425 card is the link, confirmed by hit-testing), checkbox glyphs inside ≥44px labels,
the off-screen honeypot input, and inline links inside prose sentences.

## Prompt

Give the agorasim public site the same mobile pass the admin already has. Read
.icm/intake/AGORA-004-public-mobile-pass.md, .icm/docs/launch-plan.md (Phase 3) and
web/docs/admin-mobile-design-spec.md for full context. Open a PR on a claude/ branch; do
not run local checks — CI is the source of truth.
