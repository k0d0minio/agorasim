# Agorasim — project register

> Last `/project` run: 2026-09-18 · commit `a271fe8`
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
  her phone; the 4% application fee lands via Stripe Connect. The interim bar (sandbox
  booking end-to-end at agorasim.jamienisbet.com) was met 2026-08-31; the code on `main`
  is launch-complete and the switch is human work (`intake/go-live/`).
- **Explicitly not** — a marketplace, a CMS, or a hand-rolled orchestrator. No feature
  outside the six contracted ones plus what Jamie decides to gift.

## Business logic

- **Pricing is public-vs-private** (prices.pdf, 2026-08-18): public departures are
  per-person with adult/child(4–12)/infant(<4, free) bands and minimums (Óbidos public
  min 2 pax); private tours are flat group tiers (Countryside €220–€700 for 1–12 pax).
  Add-ons only on the private Countryside tour: Tasco Galapito €60/€25, Manzwine €35pp
  min 2 (closed Mondays), Ramilo €45pp min 3. Olaria MZ is retired — never reintroduce.
  **Tiers and minimums count adults only** (client, 2026-09-11 — D19).
- **Capacity is drivers and cars, not seats**: 2 drivers across 4 cars (2CV, 4L,
  Fiat 600 = 3 guests each; VW T3 = 8). Two departures a day, 10:00 and 14:00; no fixed
  days off; seasons closed via the calendar. Óbidos runs in a non-classic touring
  vehicle and meets in Lisbon (Alameda Cardeal Cerejeira); Countryside meets in Sintra
  (Av. Mário Firmino Miguel). Parties above 8 go to enquiry until the client answers the
  big-group/third-driver question. No seat sharing between bookings until answered.
  A deposit-paid wedding or event must draw on the same pool — how much (the day, one
  departure, one car) is open (`quote-flow/event-holds-capacity`).
- **Money**: full payment at booking; free cancellation up to 48h before (guest's own
  signed link; automatic refund); bad weather → an audited in-place move, refund on
  extreme conditions. Commission: 4% of booking total (min €10, cap €50) on tours; 6% on
  weddings/events taken proportionally on each payment; as Stripe Connect application
  fees on Agorasim's own account; refunds return commission pro-rata. **Fees are on from
  the first live booking; the agreement is signed after** (D17). Manual bookings from a
  phone call or cash are registered from the Calendar or the Sales board.
- **Weddings/events**: quote per event, by hand from the enquiry until the builder ships
  (D20); 30% deposit holds the date via a token-gated quote page that mints the payment
  on tap (D25); balance auto-collected 14 days before by a second link; deposit
  non-refundable inside 30 days (default until the client confirms; [LAWYER] on the
  sinal regime and on an our-side cancellation rule). Book 3–4 months ahead. Offer:
  couple transport, photo sessions, floral decoration, personalised boards.
- **Messages** (client's own §2.6 words): welcome/confirmation with meeting-point pin
  (shipped), enquiry acknowledgement (shipped), day-before reminder, post-tour thank-you
  with their Google review link (soft opt-in, opt-out line — D24). Every automatic send
  is recorded exactly once in the message log; the log is inside retention and erasure.
- **No analytics, no cookies** (D23): the privacy page's "nothing to consent to" claim
  is a product rule, not a gap.

## Features

| Feature | State | Tickets |
|---|---|---|
| Client-data security (repo private, registrar credential rotated) | shipped | — the info PDF stays tracked by decision (D26) |
| ① Website PT/EN + GEO — core pages, JSON-LD, hreflang, env-driven origin | shipped | — |
| Content truth (Olaria purge, llms.txt, testimonials, public prices, Óbidos truth) | shipped | — epic archived 2026-08-31; tree purged 2026-09-11 |
| ③ Instant booking — calendar, capacity pools, checkout, confirmation, manual/phone/cash bookings | shipped (sandbox keys) | — live money is `go-live/` |
| Commission engine — 4% Connect application fee, refunds pro-rata, dashboard refunds reconciled | shipped | — switches on with the connected account (`go-live/stripe-connect-live`) |
| Guest self-serve cancellation (48h), admin cancel/refund, weather move | shipped | — |
| ⑥ Weddings & events — the two enquiry doors | shipped | — (#101) |
| ⑥ Weddings & events — quote builder, deposit page, refunds, capacity, T−14 balance | ticketed | quote-flow/ (6 stubs) |
| ⑤ Lifecycle emails — confirmation in the §2.6 voice, enquiry ack, message log, daily dispatcher | shipped | — |
| ⑤ Lifecycle emails — day-before reminder, thank-you + review link, Notifications page | ticketed | lifecycle-messages/ (4 stubs) |
| ⑤ SMS notifications | wanted | — post-live (D5); provider undecided |
| ② AI blog — studio, drafts table, one-tap publish, loader | shipped | — (#64) |
| ② AI blog — first batch through the content pipeline | wanted | — parked (D22); research brief exists (#68) |
| ④ Social generator + Meta auto-poster | wanted | — parked (D22); auto-poster gated on client IG/FB access |
| Admin console — CRM, calendar, catalogue, auth, audit, GDPR, em português, HIG pass, PWA manifest + phone guide | shipped | — |
| Launch cutover — code half (terms, privacy, footer, Sentry, nightly backup, old-site redirects, env-driven origin) | shipped | — |
| Go-live — registrar transfer, Connect live, sending domain, env guard, copy truth, fallback test, the switch | ticketed | go-live/ (7 open of 9 — 3 human) |
| Admin extras — money view, what-needs-me dashboard, lead source, offline floor | wanted | — parked (D22) |
| Web analytics | out | — never contracted; contradicts the no-analytics claim (D23); bot PR #99 closes |
| Referral programme | out | — D2 |
| Gift vouchers | out | — D13 |

## Constraints

- **Technical** — Next.js App Router in `web/`, ISR (revalidate 3600) over Neon +
  build-time fallback; Stripe Connect direct charges (sandbox on previews, live keys in
  Production only); Resend for email; Vercel hosting, one project, previews on every
  push; pnpm. ICM workspaces stay markdown + human gates — never an orchestrator. CI is
  the source of truth; no local checks. **No formatter** in the repo (ESLint only).
  `main` cannot be protected on this plan (private, free): PR-only discipline and
  `ci-status.sh` GREEN are the gate (D21). The repo is on the estate's **pipeline
  profile** (D21): `.icm/CONTEXT.md`, `_shared/project-rules.md`, `project.json`.
- **Accessibility** — public site: **WCAG 2.2 AA** (D14). Admin: Apple-HIG-informed
  mobile-first, Portuguese-only (D4) — Rita's phone is the reference device; nothing
  below 12px, ≥44px targets (repo's own `web/docs/admin-mobile-design-spec.md`).
- **Legal / data** — GDPR (PT/EU): PII in `tour_requests`, `bookings`, `message_log`
  (inside retention and erasure — met) and, once quotes exist, `quotes.venue` and line
  items (`quote-flow/quote-data-hygiene`); privacy policy keeps its draft banner until
  RNAAT + insurance + invoicing answers arrive; terms-of-sale and Livro de Reclamações
  shipped. No analytics/cookies (D23). Retention 24 months for unconverted enquiries is
  a proposal, unsigned. Nothing here is legal advice; `[LAWYER]` marks what needs counsel.
- **Commercial** — €2,000 flat for the six features (proposal 23 Jul 2026, accepted) +
  commission (4%/6%) per the agreement to be signed after launch (D17); the go-live is
  the objective; the agorasim.pt switch is client-driven (registrar transfer, D18).

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
| D17 | Fees on from the first live booking; the Commission & Payments Agreement is signed after (waived in writing, runbook §4a Q4) | 2026-09-10 | D16 |
| D18 | Full registrar transfer to the Portuguese registrar at pt.pt, registrant the company; the zone is mirrored record-for-record and verified before any nameserver change; the site goes live when the domain lands | 2026-09-11 | — |
| D19 | PAX tiers and minimums count adults only (client's answer); `web/src/lib/pricing.ts` already did | 2026-09-11 | — |
| D20 | The quote flow ships in two halves: the public casamentos/eventos enquiry doors first (#101), quoting by hand until the builder, deposit page and balance job land (`quote-flow/`) | 2026-09-11 | — (refines D10) |
| D21 | Pipeline profile adopted (estate D20): personas `guest` · `team` · `operator`; docs tree `.icm/docs`; announce by hand, no changelog; no formatter; `main` unprotected by the plan's limits — PR-only discipline and `ci-status.sh` GREEN are the gate, moving the Production deploy behind `db:migrate` is a later chore | 2026-09-18 | — |
| D22 | Post-launch order: lifecycle messages and weddings money return to the board first; blog, social, admin extras and SMS stay parked until re-cut after launch | 2026-09-18 | — |
| D23 | No web analytics: the no-analytics/no-cookie claim stays true; bot PR #99 (Vercel Web Analytics) closes unmerged | 2026-09-18 | — |
| D24 | The thank-you email goes to every guest under the soft opt-in (existing customer, own service, one send, an opt-out line; privacy policy's email list updated in the same PR); the day-before reminder is contract performance | 2026-09-18 | — |
| D25 | The deposit and the balance are paid from a token-gated quote page that mints the Checkout session on tap; no long-lived Stripe Payment Link objects | 2026-09-18 | — |
| D26 | `.icm/docs/agorasim-info.pdf` (credentials, IBAN) stays tracked while the repo is private; `untrack-credential-pdfs` dropped (#36). The `.gitignore` rule for it is dead on a tracked file | 2026-08-31 | D15 (the untracking half) |

## Open questions

**Client (ride `workspaces/deals/diogo-rita/open-questions.md` in icm-board; Jamie sends):**
- Big groups / third driver, and seat sharing between bookings — blocks lifting the
  >8-party enquiry fallback and any shared-seat calendar semantics.
- What a deposit-paid wedding or event takes out of the pool — the whole day, one
  departure, N specific cars — blocks `quote-flow/event-holds-capacity`.
- Balance unpaid at T−0: date released and deposit kept, or Rita chases and the system
  only flags? And is the T−7 automatic chaser wanted? — blocks the release rule in
  `quote-flow/balance-scheduler` (the T−14 issue job can ship without it).
- `[LAWYER]` the 30% "sinal" wording (Código Civil arts. 440–442 double-return exposure)
  and an our-side cancellation rule for events — before the first real deposit.
- Óbidos departure times — now bites the day-before reminder too (ships with the honest
  "exact time follows" copy until answered).
- Manzwine minimum: 2 adults or 2 guests?
- RNAAT nº, insurance provider + policy, Livro de Reclamações registration, VAT regime
  (CIVA art. 53 exemption or not — the terms say "includes VAT") — blocks dropping the
  privacy and terms draft banners; the business's own obligations either way.
- IG/FB admin access + Business account — blocks the social auto-poster (parked).
- Photos re-send (T3 wedding shot only) · wedding-awards claim source · photo-session
  coverage area.
- Retention: sign off 24 months for unconverted enquiries (or name a number).
- Voice: how the PT welcome addresses a guest (today every guest is greeted in the
  feminine); whether the tour ack promises a reply window; who signs guest mail.

**Jamie:**
- Sign the Commission & Payments Agreement after launch (D17) — deal folder action.
- Own faturação cadence for application fees — accountant question, not a repo ticket.
- Google reviews: link-first in the thank-you (D24); widget on-site later?
- The two unbuilt admin areas (Mensagens automáticas, Redes sociais) at go-live: hide
  from Rita's nav, or translate the previews? (`lifecycle-messages/notifications-page-real`
  settles the first; the social preview is parked.)
- Has the nightly backup run green in Production, and has the restore been rehearsed
  against a Neon branch? Nothing in the repo shows either.
- Do any `experiences.image` rows point at the two 22 MB JPEGs nothing in code
  references? Decides delete vs resize in `triage/oversized-images-in-git`.
- `web/docs/` is deleted in the working tree on this machine, uncommitted, by something
  other than the 2026-09-18 session — intended (then the register, the knowledge map
  and five code comments need repointing) or accidental?
- `.icm/docs/agorasim-info.pdf` holds credentials and an IBAN and is tracked (D26):
  keep while private, or untrack and purge history before anyone else is added?
- `main` gating (D21): revisit GitHub Pro or deploy-from-Actions once live.

## Run log

| Date | Commit | What changed |
|---|---|---|
| 2026-08-29 | `21d39ea` | First run. Register established from the accepted proposal + info/prices PDFs + DEAL.md; 16 decisions; 11 epics (51 stubs) + 6 triage stubs cut onto the empty post-D14 board; repo flipped private; client question pack amended (unsent). |
| 2026-09-18 | `a271fe8` | Re-run after 80 commits and the 2026-09-11 purge. Pipeline profile set up (branch `claude/pipeline-profile`, one PR). Features table rebuilt against `main` (14 rows shipped); D17–D26 appended; go-live amended (+3 session stubs, resequenced to 9); lifecycle-messages (4) and quote-flow (6) re-cut from the purged epics with the six lenses' evidence; 19 triage stubs; open questions refreshed. |
