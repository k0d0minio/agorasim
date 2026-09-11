# Stub: The switch — nameservers move, Production goes live, first real euro

- feature-slug: go-live-on-landing
- epic: go-live
- priority: P0
- size: M
- depends-on: domain-transfer-tonight, stripe-connect-live, resend-sending-domain
- sequence: 6 of 6
- blocked: human — waits for the registrar transfer to land (DNS.pt / the Portuguese registrar control the clock) and for Diogo & Rita's Stripe account to verify
- sources: Jamie 2026-09-11 (go live when the domain is available after the transfer; Connect fee on from booking one); `.icm/docs/launch-runbook.md` § Tracks G and H; Vercel project `agorasim` (team Kodominio) already holds `agorasim.pt` + `www.agorasim.pt`; `site.domain` hardcoded to `https://agorasim.pt`

## Problem

Once the domain sits at the new registrar with the mirrored zone, going live is the
nameserver switch plus the Production env. Every step is cheap; the ordering is
everything: env before DNS (so the first request on agorasim.pt already has live keys),
`STRIPE_CONNECTED_ACCOUNT_ID` only after the account is verified, and the €1 test before
anyone is told the site is live.

## Proposed change

Jamie, per runbook § Track G: Production env set (`STRIPE_SECRET_KEY` live,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECTED_ACCOUNT_ID`, `NEXT_PUBLIC_SITE_URL`,
`BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS`, `SENTRY_DSN`,
`BACKUP_BLOB_READ_WRITE_TOKEN`), redeploy, Neon manual snapshot, then nameservers →
the new registrar's, Vercel shows both domains valid with certificates, Track H
verification, €1 booking → Sales board → both emails from `reservas@` → refund from the
admin → fee taken and returned on both Stripe dashboards; mail in/out of info@ proven;
branch protection on `main`. Session work: read back the result and report.

## Acceptance criteria (rough)

- [ ] `https://agorasim.pt` serves the new site; www redirects to apex; sitemap/canonicals/hreflang say agorasim.pt; old WordPress URLs 301
- [ ] €1 live booking confirmed → refunded; fee taken and returned; webhook 200s
- [ ] info@ mail uninterrupted; Workspace billing page unchanged; rollback values recorded

## Prompt

In the agorasim repo, read `.icm/intake/go-live/go-live-on-landing.md` and
`.icm/docs/launch-runbook.md` § Tracks G–H. First confirm with Jamie that
`domain-transfer-tonight`, `stripe-connect-live` and `resend-sending-domain` are done
(their stubs in `.icm/intake/go-live/_done/`, or Jamie's word). Gates, DNS and keys are
Jamie's — prepare, verify, report; never tick his boxes. Run the Track H checks you can
run from a session (HTTP, sitemap, canonicals, redirects, `web/scripts/dns-snapshot.sh`)
and report. When Jamie confirms the €1 test, `git mv` this stub and archive the epic
(`git mv .icm/intake/go-live .icm/intake/_done/go-live`) in a PR on a `claude/` branch.
