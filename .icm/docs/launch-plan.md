# Agorasim — Launch Plan

**Owner:** Jamie · **Written:** 10 August 2026 · **Target: live in ~14 days (≈ 24 August)**

> **Tickets:** the phases of this plan are cut as [`../intake/`](../intake/) tickets
> `AGORA-001`–`AGORA-006`; work them there. This file stays as the narrative source
> (decisions, codebase audit, risks).

Companion doc: [`information-request-diogo-rita.md`](./information-request-diogo-rita.md) — send it on day 1; Section 1 of that doc gates Phases 1–2 here.

## Decisions locked in

- **Booking model:** real-time availability — customer picks an open date from a live calendar.
- **Payment:** **full payment online (Stripe)** at booking. Fallback if Stripe activation slips: slot-pick → pay offline (see Risks).
- **Interim:** the existing `TourRequestForm` goes live immediately so no lead is lost while the calendar flow is built.
- **Launch scope:** core site + **weddings** (`/casamentos`). Blog and referrals stay noindexed previews.
- **Legal:** Diogo & Rita supply company facts; we draft the privacy policy from the existing GDPR baseline.
- **Availability model:** decided by Diogo & Rita's capacity answers; plan assumes simple per-day slots until told otherwise.
- **Docs:** markdown in this repo is the source of truth.

## Where the codebase actually is (audit, 10 Aug)

Stronger than expected. Bilingual PT/EN properly wired, JSON-LD/SEO layer done (`web/src/lib/jsonld.ts`, `seo.ts`), full admin console with Sales board, Neon/Drizzle Postgres, 100+ tests, disciplined live-vs-preview routing (`web/src/lib/routes.ts`).

The gaps:

1. **Zero lead capture.** `web/src/components/tour-request-form.tsx` + its server action (`web/src/app/[locale]/reservar/actions.ts`) are complete and tested but mounted nowhere — `/reservar` renders `BookingFlow`, a visual preview with a disabled pay button (swapped in by commit `374aa32`, 29 Jul).
2. **All commercial data is fake.** Prices in `web/src/content/booking.ts` are labelled illustrative; the calendar is hardcoded August 2026 with invented busy days.
3. **Legal blanks.** ~10 `TODO(legal)` markers in `web/src/content/privacy.ts` (name, NIF, address, retention); the rendered policy shows a draft banner.
4. **Thin media.** 8 real photos; partners reuse generic car shots; weddings page has two "photographs on their way" tiles; `public/video.mp4` is **40 MB** on the mobile critical path.
5. **Public site never got the mobile pass** the admin got last week — no `viewport` export, unaudited at phone width. Admin is the reference standard (`web/src/app/admin/layout.tsx`, `web/docs/admin-mobile-design-spec.md`).
6. Mock data seeded by `0001_seed_mock_content.sql` and `web/src/lib/admin-preview.ts` must not reach production.

---

## Phase 0 — Stop the bleeding (Day 1)

*No dependencies on anyone. Do today.*

- [ ] Mount `TourRequestForm` on `/reservar`, replacing the `BookingFlow` preview. Add it (or a link to it) on `/contactos`.
- [ ] Verify submissions land on the admin Sales board end-to-end, on a phone.
- [ ] Send `information-request-diogo-rita.md` to Diogo & Rita; book the 15-min DNS call.
- [ ] Start Stripe onboarding the moment their details arrive (longest external lead time).

**Done when:** a stranger on a phone can request a tour on the live-ready branch, and the info request is in Diogo & Rita's hands.

## Phase 1 — Real facts in (Days 1–4)

*Gated by their Section 1 answers. Chase daily.*

- [ ] Fill every `TODO(legal)` in `privacy.ts`; remove the draft banner.
- [ ] Replace placeholder prices in `booking.ts` and anywhere prices render; encode the real cancellation/refund policy (must be exact — customers pay in full).
- [ ] Lock the availability model from their capacity answers (default: one bookable slot per day; per-car only if they genuinely run parallel tours).
- [ ] Ensure production DB is clean: mock seed migration and `admin-preview` examples excluded from prod.

**Done when:** nothing user-visible is invented, and the booking engine has a definite data model to build against.

## Phase 2 — Booking engine with payment (Days 3–9)

*The core build. Start the schema before prices arrive if needed.*

- [ ] `availability` schema in Drizzle + migration (date, slot, capacity, status).
- [ ] Admin calendar management — open/close dates from a phone. Reuse the admin mobile patterns; this is Diogo & Rita's daily tool.
- [ ] Public calendar on `/reservar` reading real availability (replaces the hardcoded preview data). Server-checked, not just UI.
- [ ] Stripe Checkout: full payment, price from the server, webhook confirms → booking recorded on Sales board + availability consumed. Handle abandoned/failed payment (slot hold with expiry, or optimistic release).
- [ ] Confirmation emails (Resend) to customer and to Diogo/Rita, PT/EN.
- [ ] Tests to the standard of the existing suite; test-mode Stripe end-to-end on a phone.

**Done when:** a test customer picks a real open date, pays with a Stripe test card on a phone, the date closes, everyone gets emailed, and the booking is on the Sales board.

## Phase 3 — Public mobile pass (Days 6–10, overlaps Phase 2)

*The explicit priority: navigable and actionable from a phone.*

- [ ] Add a proper `viewport` export to the public layout (mirror the admin's, incl. `dvh` usage).
- [ ] **Kill the 40 MB video**: compress hard (~2–4 MB target) or serve a static poster on mobile; measure before/after.
- [ ] Audit every launch route at 390×844 like the admin was: tap targets, sticky CTA to book, header/nav (`site-header.tsx` / `mobile-nav.tsx`), form usability, image sizes.
- [ ] Lighthouse mobile on home, `/experiencias`, `/reservar` — fix the worst offenders, record scores.

**Done when:** every launch route is comfortable one-thumb on a real phone and mobile Lighthouse is respectable.

## Phase 4 — Content & weddings (Days 8–12)

*Gated by their Section 2 answers — chase from day 4.*

- [ ] Ingest photos: partners, Renault 4L + VW T3 (removes "photographs on their way"), tour-in-action shots. Optimize everything.
- [ ] Car details and stories into `site.ts` / experience content.
- [ ] Weddings: real offer + pricing into `weddings.ts`, enable the enquiry form, flip `/casamentos` to live in `routes.ts` (sitemap + index follow automatically).
- [ ] Testimonials section from their 3–5 quotes.
- [ ] PT/EN parity check on all new content (`Localized<T>` everywhere).

**Done when:** no placeholder imagery or copy on any launch route; weddings is live and enquirable.

## Phase 5 — Launch (Days 12–14)

- [ ] Full regression: booking + payment (live-mode €1 test, refunded), weddings enquiry, both locales, phone-first.
- [ ] Confirm sitemap/robots reflect launch scope; previews still noindexed.
- [ ] DNS cutover of agorasim.pt (access secured in Phase 0); redirects from any legacy URLs.
- [ ] Post-launch watch: Stripe webhooks, error logs, first real bookings. Diogo & Rita shown the admin flow on their phones (15-min walkthrough).
- [ ] Rollback plan: DNS revert to old site.

**Done when:** agorasim.pt serves the new site and the first real paid booking has been processed.

---

## Risks & fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| Stripe activation exceeds window | Medium — external identity checks | Launch with slot-pick → pay offline (Phase 2 minus Checkout); flip payment on when activated. **Decide by day 10.** |
| Section 1 answers late | High — they're busy | Daily chase; anything site-blocking escalates to a call. Launch date moves day-for-day with 1.1/1.4/1.5. |
| DNS access stalls | Medium | Get the registrar call booked day 1; worst case launch on a temporary domain and cut over later (avoid — splits SEO). |
| Photos don't arrive | Medium | Launch partners with best generic shots + honest copy; swap when photos land. Not launch-blocking. |
| Full-payment refunds create ops pain | Real | Refund policy encoded exactly (1.4); refunds via Stripe dashboard — show Diogo & Rita how. |

## Explicitly out of scope for launch

Blog & referrals (stay previews) · GEO content pipeline first run (week after launch — engine is ready in `workspaces/`) · gift vouchers · per-car booking granularity unless capacity answers demand it.
