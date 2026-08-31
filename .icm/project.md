# Agorasim — project register

> Last `/project` run: 2026-08-29 · commit `21d39ea`
> Maintained by `/project`. Amend by re-running it, not by hand-editing during a session.

## What this is

The booking platform and operations toolkit for Agorasim — Diogo & Rita's guided
classic-car tours of the Saloia region (Sintra · Mafra · Ericeira) plus the Óbidos &
Medieval Villages food tour and wedding/event car hire. Guests find, book and pay on the
site; Diogo & Rita run the business from the admin console (Rita phone-first). The repo
also carries the ICM content workspaces that feed the site's GEO/blog/social content.
One job: **take paid bookings on their own site**, replacing the third party that takes
€40 a booking.

## Intent

- **For whom** — guests (mostly international tourists, EN + PT) booking tours online;
  Diogo & Rita operating daily from the admin (Rita: calendar from her phone).
- **The job** — instant paid tour bookings on agorasim.pt with the commission model on
  top. Everything else (blog, social, emails) exists to feed that funnel.
- **Done looks like** — a guest pays for a real tour on the live domain; Rita sees it on
  her phone; the 4% application fee lands via Stripe Connect. Interim bar (deal objective
  2026-08-27): sandbox booking end-to-end at agorasim.jamienisbet.com for their testing.
- **Explicitly not** — a marketplace, a CMS, or a hand-rolled orchestrator. No feature
  outside the six contracted ones plus what Jamie decides to gift.

## Business logic

- **Pricing is public-vs-private** (prices.pdf, 2026-08-18): public departures are
  per-person with adult/child(4–12)/infant(<4, free) bands and minimums (Óbidos public
  min 2 pax); private tours are flat group tiers (Countryside €220–€700 for 1–12 pax).
  Add-ons only on the private Countryside tour: Tasco Galapito €60/€25, Manzwine €35pp
  min 2 (closed Mondays), Ramilo €45pp min 3. Olaria MZ is retired — never reintroduce.
  **Open**: whether tiers/minimums count PAX (adults+children) or adults only — asked.
- **Capacity is drivers and cars, not seats**: 2 drivers across 4 cars (2CV, 4L,
  Fiat 600 = 3 guests each; VW T3 = 8). Two departures a day, 10:00 and 14:00; no fixed
  days off; seasons closed via the calendar. Óbidos runs in a non-classic touring
  vehicle and meets in Lisbon (Alameda Cardeal Cerejeira); Countryside meets in Sintra
  (Av. Mário Firmino Miguel). Parties above 8 go to enquiry until the client answers the
  big-group/third-driver question. No seat sharing between bookings until answered.
- **Money**: full payment at booking; free cancellation up to 48h before; bad weather →
  reschedule, refund on extreme conditions. Commission: 4% of booking total (min €10,
  cap €50) on tours; 6% on weddings/events taken proportionally on each payment; as
  Stripe Connect application fees on Agorasim's own account; refunds return commission
  pro-rata. **Fees never activate before the Commission & Payments Agreement is signed.**
- **Weddings/events**: quote per event; 30% deposit holds the date via payment link;
  balance auto-collected 14 days before; deposit non-refundable inside 30 days
  (default until client confirms; [LAWYER] on the sinal regime). Book 3–4 months ahead.
  Offer: couple transport, photo sessions, floral decoration, personalised boards.
- **Messages** (client's own §2.6 words): welcome/confirmation with meeting-point pin,
  day-before reminder, post-tour thank-you with their Google review link.

## Features

| Feature | State | Tickets |
|---|---|---|
| Client-data security (repo private, credentials out) | ticketed | secure-client-data/ (2 stubs — the privacy flip itself was done in-run, D15) |
| ① Website PT/EN + GEO — core pages, JSON-LD, hreflang | shipped | — content completion below |
| ① Content truth (Olaria purge, llms.txt, testimonials, public prices, Óbidos truth) | ticketed | content-truth/ (7 stubs) |
| ③ Instant booking (engine + PR #31 pools + sandbox handover) | ticketed | booking-live/ (8 stubs) |
| Commission engine (Stripe Connect application fees) | ticketed | commission-engine/ (3 stubs) |
| Guest self-serve cancellation (48h) + refunds | ticketed | cancellation-selfserve/ (4 stubs) |
| ⑥ Weddings & events quote flow + payment links | ticketed | quote-flow/ (5 stubs) |
| ⑤ Lifecycle emails (ack, reminder, thank-you, sent-log) | ticketed | lifecycle-messages/ (6 stubs) |
| ⑤ SMS notifications | wanted | — post-live; provider undecided |
| ② AI blog (pipeline → drafts → one-tap publish) | ticketed | blog-engine/ (2 stubs) |
| ④ Social generator + auto-poster | ticketed | social-engine/ (2 stubs) |
| Admin console — CRM, calendar, catalogue, auth, audit, GDPR | shipped | — |
| Admin em português + HIG polish | ticketed | admin-portugues/ (4 stubs) |
| Launch cutover (runbook, terms, compliance, observability, DNS) | ticketed | launch-cutover/ (8 stubs) |
| Referral programme | out | — dropped 2026-08-29, never contracted; removal: content-truth/_done/remove-referral-surface |
| Gift vouchers | out | — dead-proposal add-on; client interest logged 2026-08-18, revisit post-launch |

## Constraints

- **Technical** — Next.js App Router in `web/`, ISR (revalidate 3600) over Neon +
  build-time fallback; Stripe (sandbox on Jamie's account until the client's exists);
  Resend for email; Vercel hosting; pnpm. ICM workspaces stay markdown + human gates —
  never an orchestrator. CI is the source of truth; no local checks.
- **Accessibility** — public site: **WCAG 2.2 AA** (D14). Admin: Apple-HIG-informed
  mobile-first, Portuguese-only (D4) — Rita's phone is the reference device; nothing
  below 12px (repo's own `web/docs/admin-mobile-design-spec.md`).
- **Legal / data** — GDPR (PT/EU): PII only in `tour_requests` (+ future message log,
  which must join retention/erasure scope); privacy policy keeps its draft banner until
  RNAAT + insurance + invoicing answers arrive; terms-of-sale and Livro de Reclamações
  are launch-gating. No analytics/cookies — keep the no-banner claim true.
- **Commercial** — €2,000 flat for the six features (proposal 23 Jul 2026, accepted) +
  commission (4%/6%) per the unsigned-but-intended agreement; sandbox-testable version
  ASAP is the objective; the agorasim.pt switch is client-driven and independent.

## Decisions

| ID | Decision | Date | Supersedes |
|---|---|---|---|
| D1 | Land stranded PR #31 (driver/vehicle pools) and rescue PR #30 (weddings content) rather than rebuild | 2026-08-29 | — |
| D2 | Referral programme dropped entirely — never contracted, never requested | 2026-08-29 | — |
| D3 | Example bookings removed from the live Sales board | 2026-08-29 | — |
| D4 | Admin: HIG mobile-first + hardcoded Portuguese (no i18n rig); public site targeted fixes only | 2026-08-29 | — |
| D5 | Lifecycle messages email-first; SMS deferred until post-live | 2026-08-29 | — |
| D6 | Build order: booking-first sandbox v1; commission engine immediately after, before live | 2026-08-29 | — |
| D7 | Guest self-serve cancellation via signed links; default automatic refund outside 48h (client to confirm) | 2026-08-29 | — |
| D8 | Full real price tables on experience pages + Offer JSON-LD | 2026-08-29 | — |
| D9 | Weddings deposit default: non-refundable inside 30 days, free date-change subject to availability | 2026-08-29 | — |
| D10 | One quote flow, two doors: casamentos + eventos via `enquiry_kind` wedding/event | 2026-08-29 | — |
| D11 | Blog model: Jamie runs the ICM pipeline; drafts land in `blog_post_drafts`; client one-tap publishes in the Blog studio | 2026-08-29 | — |
| D12 | Social: generator + manual posting now; Meta auto-poster gated on client IG/FB access | 2026-08-29 | — |
| D13 | Gift vouchers stay out (dead proposal); interest logged for post-launch | 2026-08-29 | — |
| D14 | Public-site accessibility bar: WCAG 2.2 AA | 2026-08-29 | — |
| D15 | Repo flipped private (was public with client documents); credential PDFs untracked and registrar password rotated — P0 epic | 2026-08-29 | — |
| D16 | Commission fees activate only after the Commission & Payments Agreement is signed | 2026-08-29 | — |

## Open questions

**Client (ride `workspaces/deals/diogo-rita/open-questions.md` in icm-board — pack
updated this run, still unsent; Jamie sends):**
- Big groups / third driver, and seat sharing between bookings — blocks lifting the
  >8-party enquiry fallback and any shared-seat calendar semantics.
- Do price tiers/minimums count PAX or adults? — blocks `booking-live/pax-tier-semantics`
  (real-money correctness).
- Óbidos departure times — blocks opening Óbidos availability honestly.
- Manzwine minimum: 2 adults or 2 guests?
- Self-serve cancellation: automatic refund, or team confirms first?
- Weddings deposit window + minimum quote value (30-day default meanwhile).
- IG/FB admin access + Business account — blocks `social-engine/meta-autoposter`.
- RNAAT nº, insurance provider + policy, self-invoicing — blocks dropping the privacy
  draft banner and the terms-of-sale page's seller identity (launch-gating).
- Photos re-send (WeTransfer links expired/expiring; T3 + 4L wedding shots) — blocks
  `content-truth/wedding-fleet-photos`.
- Wedding-awards claim source (2022–2026 badges) · photo-session coverage area.
- Domain recovery status (theirs to drive).
- Retention: sign off 24 months for unconverted enquiries (or name a number).

**Jamie:**
- Sign the Commission & Payments Agreement before fees flow (D16) — deal folder action.
- Own faturação cadence for application fees — accountant question, not a repo ticket.
- Google reviews: link-first now (in thank-you email); widget on-site later? Decide at
  `lifecycle-messages/thankyou-review-email` pick-up.
- Weather reschedule shape: default is an audited in-place date/slot edit
  (`cancellation-selfserve/admin-move-booking`); revisit if a history trail is wanted.

## Run log

| Date | Commit | What changed |
|---|---|---|
| 2026-08-29 | `21d39ea` | First run. Register established from the accepted proposal + info/prices PDFs + DEAL.md; 16 decisions; 11 epics (51 stubs) + 6 triage stubs cut onto the empty post-D14 board; repo flipped private; client question pack amended (unsent). |
