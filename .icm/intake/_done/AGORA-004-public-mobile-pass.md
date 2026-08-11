# AGORA-004 · Public-site mobile pass

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 3 |

## Problem

The public site never got the mobile pass the admin got: no `viewport` export, unaudited at
phone width, and `public/video.mp4` is 40 MB on the mobile critical path. The admin is the
reference standard (`web/src/app/admin/layout.tsx`, `web/docs/admin-mobile-design-spec.md`).

## Acceptance

- [ ] Proper `viewport` export on the public layout (mirror the admin's, incl. `dvh`).
- [ ] Video compressed hard (~2–4 MB) or a static poster served on mobile; before/after
      sizes recorded.
- [ ] Every launch route audited at 390×844: tap targets, sticky book CTA, header/nav,
      form usability, image sizes.
- [ ] Lighthouse mobile run on home, `/experiencias`, `/reservar`; worst offenders fixed,
      scores recorded.
- [ ] CI green.

## Prompt

Give the agorasim public site the same mobile pass the admin already has. Read
.icm/intake/AGORA-004-public-mobile-pass.md, .icm/docs/launch-plan.md (Phase 3) and
web/docs/admin-mobile-design-spec.md for full context. Open a PR on a claude/ branch; do
not run local checks — CI is the source of truth.
