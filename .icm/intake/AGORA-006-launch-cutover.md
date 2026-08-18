# AGORA-006 · Launch: regression, DNS cutover, post-launch watch

| | |
|---|---|
| Status | ready |
| Type | config |
| Priority | P1 |
| Size | S |
| Depends on | AGORA-001–005 |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 5 · **runbook: [.icm/docs/launch-runbook.md](../docs/launch-runbook.md)** |

## Problem

The final cutover of agorasim.pt to the new site (target ≈ 24 August 2026), with a full
regression first and a rollback path.

## Acceptance

- [ ] Full regression: booking + payment (live-mode €1 test, refunded), weddings enquiry,
      both locales, phone-first.
- [ ] Sitemap/robots reflect launch scope; previews still noindexed.
- [ ] DNS cutover of agorasim.pt done; redirects from any legacy URLs.
- [ ] Post-launch watch: Stripe webhooks, error logs, first real bookings; Diogo & Rita
      walked through the admin on their phones (15 min).
- [ ] Rollback plan confirmed: DNS revert to the old site.

## Prompt

Run the agorasim launch checklist. Read .icm/intake/AGORA-006-launch-cutover.md and
.icm/docs/launch-plan.md (Phase 5 + Risks) for full context. DNS and live-payment steps are
human actions — prepare and verify everything around them, and hand Jamie the exact
cutover steps. Do not run local checks — CI is the source of truth.
