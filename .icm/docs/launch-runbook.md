# Agorasim — Launch Runbook (AGORA-006)

**Target: superseded — no promised date** (DEAL.md, 2026-08-27): the objective is
a sandbox-payments testable version at **agorasim.jamienisbet.com** first; cutover
happens when Diogo & Rita recover the domain **and** create their Stripe account,
with the Connect commission engine (AGORA-013) live before real money moves. This
remains the exact sequence for cutover day and the days around it. Prepared
18 Aug, stale facts corrected 28 Aug; the checkboxes are Jamie's to tick, never a
session's. DNS and live-payment steps are human actions by design.

## State going in (18 Aug)

- PR #29 (AGORA-002: pricing engine, two tours, two departures, real facts)
  merged. **PR #30 (AGORA-005: weddings live, cars, testimonials) never reached
  `main`** — it merged into an already-merged branch; AGORA-005 is the rescue
  ticket, and it must land before the regression pass below.
- Migration `0012` runs on merge to main via the DB-migrate workflow: seeds real
  prices + Óbidos, archives Olaria, moves `full_day` slots to `morning`, and
  **deletes the mock seed data from production**.
- Still open: AGORA-007 (RNAAT/insurance/invoicing → privacy draft banner),
  AGORA-008 (photos). Neither is launch-blocking by the plan's risk table, but
  chase both daily.
- Stripe: **per DEAL.md (27 Aug) their account has not been created** — the
  18 Aug application notes are void; development runs against a sandbox in Jamie's
  account, and their account + the Connect commission wiring (AGORA-013) are
  needed before real money moves. **Account creation is the #1 external risk —
  chase it as go-live approaches.** Fallback stands: deploy without
  `STRIPE_SECRET_KEY` and the site takes enquiries with the date picker instead
  of payment.

## Pre-flight (before DNS) — 19–23 Aug

- [ ] Merge #29 → confirm DB-migrate workflow green → merge #30.
- [ ] In `/admin/experiences`: sanity-read both tours' price summaries against the
      prices PDF (they are seeded by migration; eyeball, don't trust).
- [ ] Rita opens real availability from her phone: both tours, the days they will
      actually run, both departures. (Default seats: countryside 14, Óbidos 12.)
- [ ] **Test-mode regression, on a phone** (Stripe test keys on the preview URL):
      - Public countryside booking, 2 adults + 1 child + 1 infant — check the
        tier maths on the summary, pay with 4242…, confirm the seats decrement,
        the emails (guest PT + EN runs, team copy), and the Sales board card.
      - Private countryside + Manzwine on a *Tuesday* (Monday must refuse it),
        confirm the slot closes for everyone else afterwards.
      - Óbidos public with 1 adult must refuse (min 2); with 2 adults must pay.
      - Weddings enquiry → lands as a wedding lead; both locales.
      - Abandoned checkout: start paying, walk away, watch the hold release the
        seat after 30 min.
- [ ] Lighthouse mobile spot-check on `/`, `/experiencias`, `/reservar`,
      `/casamentos` (AGORA-004 set the bar; don't regress it).
- [ ] Sitemap (`/sitemap.xml`) lists casamentos; blog/recomendar still absent;
      preview deployments still noindexed.
- [ ] Confirm `ENQUIRY_RETENTION_DAYS`, Resend domain, and `STRIPE_WEBHOOK_SECRET`
      are set in Vercel production env.

## Stripe live check — the €1 test (launch morning, before DNS)

- [ ] Flip production env to the **live** Stripe keys; redeploy.
- [ ] Make one real booking on the production URL with a real card (cheapest
      combination; Rita can open a 1-seat test slot on a past-season weekday and
      close it after). Verify: payment lands in Stripe, booking confirms, both
      emails arrive, Sales board shows it.
- [ ] **Refund it from the Stripe dashboard** (this is also the refund walkthrough
      for Diogo & Rita — do it with them watching).
- [ ] Clear the test slot.

## DNS cutover — agorasim.pt

Registrar: amen.pt, managed via controlpanel.pro (credentials with Jamie — rotate
the password once the transfer away from the old agency completes; it has been
shared in plaintext). Domain transfer to Diogo's own control was requested 10 Aug —
check its status first; cutover works from either panel.

- [ ] In Vercel: add `agorasim.pt` + `www.agorasim.pt` to the production project;
      note the A/ALIAS + CNAME targets it asks for.
- [ ] In controlpanel.pro: lower TTL if possible, then point the apex A record and
      `www` CNAME at Vercel's targets. **Touch nothing else** — the MX records run
      the info@agorasim.pt Google Workspace mail and must stay exactly as they are.
- [ ] Wait out propagation; verify `https://agorasim.pt` serves the new site with
      a valid cert, `www` redirects, and — critically — **send + receive a test
      email to info@agorasim.pt** (proves the MX survived).
- [ ] Old site: whatever was live is superseded; if any legacy URLs mattered they
      die here (none were identified — Diogo left "anything to keep?" blank; ask
      once more before cutover).

## Post-launch watch (first 72h)

- [ ] Stripe dashboard: webhooks delivering (no retries piling up), payments settling.
- [ ] Vercel logs: `[checkout]`, `[booking]`, `[availability]` error lines.
- [ ] First real bookings appear on the Sales board with sane numbers.
- [ ] 15-min phone walkthrough with Diogo & Rita: open a day, close a day, read a
      booking, refund path, where wedding enquiries land. Rita owns the calendar.
- [ ] Day 2: chase AGORA-007 answers and AGORA-008 photos.

## Rollback

DNS is the whole rollback: repoint the A/CNAME records at the old host's values
(**write them down before changing them** — record the current values in the amen.pt
panel into a note here on cutover day). Nothing else needs undoing: the database is
additive, Stripe can be disabled by removing the live key, and the old site remains
wherever it is currently hosted until deliberately decommissioned.
