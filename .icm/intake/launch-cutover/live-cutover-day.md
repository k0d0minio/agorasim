# Stub: The switch — agorasim.pt, live keys, first real euro

- feature-slug: live-cutover-day
- epic: launch-cutover
- priority: P1
- size: M
- depends-on: restore-runbook, env-driven-domain, terms-of-sale-page, footer-compliance, privacy-refresh, resend-sending-domain, admin-accounts-and-phones, stripe-live-accounts
- sequence: 8 of 14
- blocked: client — domain recovery from previous provider + their Stripe account + §1.1 answers (RNAAT/insurance/invoicing lift the draft banners); Jamie — Commission & Payments Agreement signed (D16)
- sources: DEAL.md current objective; the restored runbook; D16

## Problem

> **Facts corrected 2026-09-10:** agorasim.pt is registered and DNS-hosted at **Amen**
> (`ns*.amenworld.com`); the old WordPress site is **live again** at `130.185.83.150`
> (not 403). Vercel already has `agorasim.pt` + `www` attached and waits for DNS. The
> switch is two records inside Amen (A + www CNAME); the registrar transfer is a
> separate, post-launch stub (`domain-registrar-transfer`). Full sequence, rollback
> values and the open question pack: `.icm/docs/launch-runbook.md`.

The choreographed day: DNS cutover at controlpanel.pro **preserving MX** (Google
Workspace mail must not blink), Vercel domain attach, `NEXT_PUBLIC_SITE_URL` flip,
live Stripe keys on the client's account with the Connect fee active, draft banners
lifted, branch protection on, €1 live test + refund, rollback values noted. Every
step is cheap; the ordering is everything.

## Proposed change

Execute the runbook with Jamie driving the human steps (registrar, Stripe keys,
banner sign-offs are his checkboxes). Session work: env flips staged, deploy
verified, the €1 test walked through, post-switch checks (canonicals, sitemap,
emails from the live domain, webhook on live endpoint, commission fee visible on
both Stripe dashboards). Take branch protection live
(`gh api` per tech lens finding — CI must gate merges once real money flows).

## Acceptance criteria (rough)

- [ ] agorasim.pt serves; info@agorasim.pt mail uninterrupted
- [ ] €1 live booking → confirmed → refunded, fee taken and returned
- [ ] Draft banners gone; branch protection on; rollback noted

## Prompt

In the agorasim repo, run cutover day per
`.icm/intake/launch-cutover/live-cutover-day.md` — but first verify every blocker
has lifted in the icm-board deal folder (domain in hand, client Stripe account
live, §1.1 answers received, agreement signed — D16 in `.icm/project.md`). If any
is missing, stop. Otherwise follow `.icm/docs/launch-runbook.md` step by step:
gates and registrar/Stripe actions are Jamie's — prepare, verify, and check results;
never tick his boxes, never touch DNS or keys yourself. Post-switch verification
list is in the stub. Ticket move + any code fixes via PR on a `claude/` branch; CI
is the source of truth.
