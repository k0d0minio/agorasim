# AGORA-009 · Admin pricing editor for the tiered price list

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Depends on | AGORA-002 (the pricing model this edits) |

## Problem

AGORA-002 replaced the one-number `price_cents` with a structured price list
(`experiences.pricing` jsonb — public/private tiers, child rates, add-on minimums;
shape in `web/src/lib/pricing.ts`). The admin catalogue editor shows it read-only;
changing a price currently means asking Jamie. Diogo & Rita should eventually own
prices the way they own the calendar.

## Acceptance

- [ ] `/admin/experiences/[id]` gains a structured pricing editor (tier rows, child
      rates, minimums) — phone-first, to the admin mobile spec.
- [ ] Validation refuses shapes `priceBooking` cannot price; a preview quotes a
      sample party so a typo is visible before saving.
- [ ] Audit log entry records price changes (who, what, when).
- [ ] The vestigial `price_cents` column dropped once nothing references it.
- [ ] CI green.

## Prompt

Build the admin pricing editor for agorasim. Read
.icm/intake/AGORA-009-admin-pricing-editor.md and web/src/lib/pricing.ts (the
ExperiencePricing shape and priceBooking engine) for context. Follow the admin
mobile design spec in web/docs/. Open a PR on a claude/ branch; no local checks —
CI is the source of truth.
