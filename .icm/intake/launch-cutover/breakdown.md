# Breakdown: Launch cutover — everything between sandbox and agorasim.pt taking real money

- epic-slug: launch-cutover
- sources: DEAL.md (domain recovery client-driven; live keys + DNS ride the switch); the deleted launch runbook (`d4d3fc4:.icm/docs/launch-runbook.md` — only cutover record, deleted at HEAD 21d39ea); 2026-08-29 legal + tech lenses; info PDF §1.1 blanks

## What I understood

Going live is a bundle of small, mostly-independent obligations plus one
choreographed day. The choreography (DNS via controlpanel.pro, **MX preservation for
the Google Workspace mail** — the client explicitly worried about this, €1 live test
+ refund, rollback values) lived in a runbook that was deleted at HEAD and survives
only in git history. The obligations: a terms-of-sale page (none exists — full
prepayment with no seller identity or withdrawal-exclusion statement), the mandatory
Livro de Reclamações/ADR footer, a privacy policy that still predates Stripe and
Resend, canonicals hardcoded to a domain the site doesn't serve from, zero error
tracking on a payment app with three designed-to-be-silent failure paths, and a rate
limiter that doesn't survive serverless. Blockers that stay the client's: RNAAT +
insurance + invoicing answers (privacy draft banner), the domain itself, their
Stripe account, and (Jamie's) the signed commission agreement (D16).

## Build order

Re-sequenced 2026-09-10 for a Saturday 2026-09-12 go-live; the full choreography and
the open question pack live in `.icm/docs/launch-runbook.md`.

1. restore-runbook — the cutover sequence back on disk (recreated, original unrecoverable) — depends-on: none ✅ `_done/`
2. env-driven-domain — canonicals/emails/JSON-LD follow the serving domain — depends-on: none
3. terms-of-sale-page — the legal terms at checkout + acceptance line — depends-on: none
4. footer-compliance — Livro de Reclamações + ADR notice — depends-on: none
5. privacy-refresh — policy catches up with Stripe/Resend; dangling refs fixed — depends-on: none
6. error-tracking — the silent failure paths get an alarm — depends-on: none
7. rate-limit-store — shared store before real traffic — depends-on: none
8. live-cutover-day — the two-record DNS switch at Amen + €1 test — depends-on: restore-runbook, env-driven-domain, terms-of-sale-page, footer-compliance, privacy-refresh, resend-sending-domain, admin-accounts-and-phones, stripe-live-accounts *(blocked: client — Stripe account + §1.1 + PAX answer; Jamie — D16)*
9. resend-sending-domain — confirmations from reservas@agorasim.pt, reply-to info@ — depends-on: none
10. admin-accounts-and-phones — Portuguese manifest + the phone guide for Diogo & Rita — depends-on: none
11. old-site-redirects — WordPress URLs 301 onto the new routes — depends-on: none
12. db-backup-floor — nightly logical export; Neon plan recommendation — depends-on: none
13. stripe-live-accounts — Jamie's live-Stripe checklist (platform + client account + webhook + env) — depends-on: none *(blocked: human)*
14. domain-registrar-transfer — Amen → Jamie's registrar, Workspace-safe, **after** launch — depends-on: live-cutover-day *(blocked: runbook Q10–Q16)*

Saturday-critical: 3, 4, 5, 9, 10, 13, then 8. Everything else follows in the week
after unless Jamie's scope answers (runbook Q3) pull it forward.

## Out of scope (whole epic)

- The commission build itself (commission-engine/) — this epic only refuses to go
  live without it activated and the agreement signed.
- Chasing the client's Stripe account and domain — deal-folder actions.
