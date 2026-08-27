# AGORA-006 · Launch: regression, DNS cutover, post-launch watch

| | |
|---|---|
| Status | blocked |
| Type | config |
| Priority | P1 |
| Size | S |
| Depends on | AGORA-005 · AGORA-012–014 (model, commission, sandbox version proven) |
| Blocked by | **agorasim.pt domain recovery** — Diogo & Rita are recovering it from their previous provider; independent of development. Also their Stripe account (not yet created) for the live-key flip. |
| Sources | **runbook: [.icm/docs/launch-runbook.md](../docs/launch-runbook.md)** · icm-board `workspaces/deals/diogo-rita/DEAL.md` |

## Problem

**Rescoped 27 Aug — no target date.** The switchover happens when Diogo & Rita recover
agorasim.pt from their previous provider, independently of development. When it lands,
this ticket is the choreography: full regression on the sandbox version, then the flip
to **live Stripe keys on their activated account** (the moment real money and the 4%/6%
commission start) together with the DNS cutover, with a rollback path.

## Acceptance

- [ ] Their Stripe account created, activated and connected; live keys + live webhook
      set (human step — Jamie, never committed); live-mode €1 test booking, refunded,
      with the application fee refunding proportionally.
- [ ] Full regression: booking + payment, weddings enquiry, both locales, phone-first.
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
