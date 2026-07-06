# Agorasim — Digital Growth Platform Proposal

**Prepared for:** Diogo & Rita, Agorasim (Rural Saloia classic-car tours — Sintra · Mafra · Ericeira)
**Prepared by:** _[Your name / studio]_
**Date:** July 2026
**Validity:** Prices held for 60 days

---

## 1. The idea in one line

Turn agorasim.pt from a brochure site into a **self-running growth engine**: a fast bilingual
website that AI search recommends, instant online booking that takes payment while the customer is
still excited, and a back office that quietly generates content, nurtures leads, and brings past
guests back — so you spend your time driving classic cars, not chasing admin.

This is built as a **long-term partnership**. You pick the pieces you want now; the rest slot in
later on the same foundation, at the same prices, whenever you're ready.

> **A note on pricing.** Every figure below is a working number at a **mid-market rate** and is
> fully adjustable. It reflects an important fact: a lot of the technical foundation already exists
> in your toolkit (the bilingual site, the GEO/JSON-LD groundwork, the lead database, the admin
> dashboard, and the content-pipeline scaffolding). So these prices are to **complete and ship**
> real features on that base — not to build from zero. That keeps them honest and competitive.

---

## 2. How to read this proposal

- **Build price** — a one-time, fixed fee to design, build, test and launch that feature.
- **Care plan** — an optional monthly retainer that keeps everything running, updated and improving
  (Section 6). This is the heart of the long-term collaboration.
- **Running costs** — third-party services (Stripe, SMS, email, AI, hosting). These are billed **at
  cost, directly to you** — no markup (Section 7).
- **Already started** — where your current codebase already contains part of the work, it's flagged,
  and the price reflects only what's left to finish.

You are free to choose **any combination**. Nothing here is all-or-nothing.

---

## 3. Core features (your requests)

| # | Feature | Build price | Status today |
|---|---------|------------:|--------------|
| 1 | Website + GEO optimization | **€2,800** | Foundation built — needs completion & polish |
| 2 | AI-automated blog | **€1,900** | Database ready — pipeline to build |
| 3 | Instant tour booking + Stripe payments | **€3,200** | New (currently FareHarbor) |
| 4 | Instant wedding-car-hire booking | **€1,900** | New _(€1,200 if taken with #3)_ |
| 5 | Social media generator + auto-poster | **€2,600** | Research done — build to do |
| 6 | Referral / word-of-mouth system | **€1,600** | New |
| 7 | Email & SMS notifications | **€1,400** | New |
| 8 | CRM pipeline tracker | **€1,500** | Basic version already live — to upgrade |
| 9 | Email marketing (past & archived guests) | **€1,700** | Database ready — sender to build |
| | **Full suite (all nine)** | **~€15,900** | **Save ~€2,700 vs. buying separately** |

Each feature is described below.

---

### Feature 1 — Website with GEO optimization · €2,800

**What it is.** A fast, mobile-first, fully bilingual (PT/EN) website that both *people* and *AI
search engines* (ChatGPT, Google AI Overviews, Perplexity, Gemini) understand and recommend when
someone asks "best classic-car tour near Sintra" or "unique day trip from Lisbon."

**What's included.**
- Complete, polished pages: home, experiences (Rural Saloia + add-ons), events/weddings, about,
  contact, booking.
- GEO best-practice on every page: structured data (JSON-LD), canonical + hreflang tags,
  answer-first copy, FAQ blocks, XML sitemap, and clean Core Web Vitals.
- Bilingual PT/EN kept perfectly in sync.
- Analytics and search-console setup so we can see what's working.

**Already started.** Your toolkit already has the Next.js bilingual site, several core pages, and
the GEO libraries (`jsonld.ts`, `seo.ts`). This price finishes the content, hardens the GEO layer,
and ships it to production.

**Why it matters.** This is the foundation everything else plugs into. AI search is where the next
wave of travel discovery is happening, and almost no local tour operator is optimized for it yet —
first-mover advantage is real and cheap right now.

---

### Feature 2 — AI-automated blog · €1,900

**What it is.** A content engine that drafts genuinely useful, on-brand articles ("A perfect day in
Ericeira," "Why the Saloia countryside is Portugal's best-kept secret") in PT and EN, and publishes
them to the site on a schedule — each one reviewed by you in one click before it goes live.

**What's included.**
- AI drafting tuned to your brand voice and facts (using the ICM configuration already in
  `workspaces/_config/`).
- Review-before-publish: drafts land in your admin dashboard; approve or edit, then publish.
- Automatic scheduling (e.g. 2–4 posts/month) with no manual work.
- Every post ships GEO-ready (structured data, internal links to your tours).

**Already started.** The `blog_post_drafts` table and the content-review dashboard already exist.
This builds the drafting pipeline and the public blog itself.

**Why it matters.** Fresh, keyword-rich content is what keeps you ranking in both Google and AI
search — and it quietly funnels readers toward your booking page. Set it up once; it runs for years.

---

### Feature 3 — Instant tour booking + Stripe payments · €3,200

**What it is.** Replace "request a tour → wait for a reply" with **book-and-pay-now**. The customer
picks a date, party size and add-ons, pays a deposit or the full amount by card, and gets an instant
confirmation — 24/7, no back-and-forth.

**What's included.**
- Availability calendar, party-size and add-on selection.
- Secure Stripe checkout (cards, Apple/Google Pay, Multibanco, MB WAY — the payment methods
  Portuguese and international guests actually use).
- Deposit-or-full-payment option, automatic confirmations, and the booking dropped straight into
  your CRM.
- Cancellation / refund handling.

**Note.** You currently route booking through FareHarbor. This gives you a **native** booking flow
you fully own — no per-booking commission to a third party.

**Why it matters.** Every hour a booking request sits unanswered is a booking you can lose to a
competitor. Instant payment captures the customer at peak intent and improves cash flow.

---

### Feature 4 — Instant wedding-car-hire booking · €1,900 _(€1,200 with Feature 3)_

**What it is.** A dedicated booking path for your classic cars as **wedding / event hire** — a
distinct, higher-value product with its own enquiry-to-deposit flow.

**What's included.**
- Wedding-specific request + quote flow (date, venue, hours, car choice).
- Deposit collection via Stripe to lock the date.
- A polished events landing page that sells the romance of a classic car at a wedding.

**Bundle saving.** If taken alongside Feature 3, it reuses the same booking-and-payment engine, so
it's **€1,200 instead of €1,900**.

**Why it matters.** Wedding hire is premium, seasonal, and highly Instagrammable — a natural
high-margin complement to your tours, and a strong social-content source.

---

### Feature 5 — Social media generator + auto-poster · €2,600

**What it is.** An engine that generates on-brand captions and post ideas (tied to your tours,
seasons, and blog posts) and — where each platform's rules allow — publishes them automatically to
Instagram, Facebook, and more, on a schedule.

**Two parts (can be phased):**
- **Generator (€1,200)** — AI writes captions, hashtags and a posting calendar; you approve in the
  dashboard. Low-risk, immediate value.
- **Auto-poster (€1,400)** — connects to the platforms' *official* APIs to publish approved posts
  automatically.

**Honest caveat (already researched in your repo).** Reliable auto-posting is only possible through
each platform's **official** API — never through unofficial bots that risk your accounts. Instagram,
Facebook, TikTok, LinkedIn and YouTube require Business/Creator accounts, per-account approval, and
in some cases a multi-week review (TikTok especially). We recommend **starting with Instagram +
Facebook** (the ones that matter most for a Portuguese tour business) and adding others later. A
hosted publishing service (~€25–40/mo) can remove most of the approval friction — your choice.

**Why it matters.** Consistent, beautiful social presence is the #1 discovery channel for
experiences like yours — but it's the first thing that slips when you're busy. This makes it
automatic.

---

### Feature 6 — Referral / word-of-mouth system · €1,600

**What it is.** Turn happy guests into your sales team. Each customer gets a personal referral link
or code; when a friend books with it, both get a reward (a discount, a free add-on tasting, etc.).

**What's included.**
- Unique referral links/codes per guest.
- Automatic tracking of who referred whom and reward fulfilment.
- A simple "share your experience" prompt after a tour (email/SMS).
- Admin view of your top referrers.

**Why it matters.** Word of mouth is already how most tours get discovered — this makes it
*measurable* and *rewarded*, so it compounds. Cheapest customer acquisition there is.

---

### Feature 7 — Email & SMS notifications · €1,400

**What it is.** Automatic, bilingual messages at the right moments — for your customers *and* for
your team.

**What's included.**
- **For guests:** booking confirmation, reminder the day before, thank-you + review request after.
- **For you:** instant alert (email/SMS) when a new booking or lead comes in.
- Channels: email (transactional) + SMS/WhatsApp-ready for the time-sensitive ones.

**Why it matters.** Reminders cut no-shows; a well-timed thank-you drives reviews and referrals; and
you never miss a hot lead. This quietly underpins Features 6 and 9.

---

### Feature 8 — CRM pipeline tracker · €1,500

**What it is.** A clear board showing every lead and customer and exactly where they stand: **Lead →
Contacted → Quoted → Booked → Archived** — so nothing and nobody falls through the cracks.

**What's included.**
- Drag-and-drop pipeline board in your admin dashboard.
- Notes, contact history and next-action reminders per person.
- Filters (by status, experience, date) and a simple activity log.
- Every website enquiry and booking flows in automatically.

**Already started.** Your dashboard already captures leads with a `new → contacted → quoted →
booked → archived` lifecycle. This upgrades it into a proper visual pipeline with notes and history —
so the price is lower than a from-scratch CRM.

**Why it matters.** With two of you sharing the work, a shared source of truth about every customer
is what lets you scale without dropping the personal touch guests love.

---

### Feature 9 — Email marketing for past & archived guests · €1,700

**What it is.** Bring former guests back and keep your brand warm. Segment your audience (past
guests, newsletter sign-ups, wedding enquiries) and send beautiful, bilingual, AI-drafted campaigns
— seasonal offers, new experiences, "come back this autumn."

**What's included.**
- Audience segments, including an **archived-guests** segment as you asked.
- AI-drafted campaigns in your brand voice, reviewed before sending.
- Scheduling, open/click tracking, and unsubscribe handling (GDPR-compliant).

**Already started.** The `email_campaign_drafts` table already exists. This builds the campaign
builder and the sending/tracking layer.

**Why it matters.** Re-selling to someone who already loved a tour is far cheaper than finding a new
customer. This turns your guest list into a recurring revenue channel.

---

## 4. Suggested add-ons (worth considering)

These aren't things you asked for, but they fit the same platform naturally and each earns its keep.

| Add-on | Price | Why it's worth it |
|--------|------:|-------------------|
| **Gift vouchers / gift cards** | €1,400 | Sell experiences as gifts (Christmas, birthdays) — paid upfront, redeemed later. Great cash flow, and buyers become new customers. |
| **Google Reviews + testimonials wall** | €900 | Pull your Google reviews onto the site automatically. Social proof is the #1 booking driver, and review count also boosts GEO/AI ranking. |
| **Analytics & revenue dashboard** | €1,200 | One screen: bookings, revenue, top experiences, conversion, referral performance. Know what's working. |
| **WhatsApp Business integration** | €1,100 | You already run on phone contact — let guests book/ask via WhatsApp, with templated confirmations. Portugal lives on WhatsApp. |
| **Extra tourist languages** (ES / FR / DE) | €700 each | Your foundation is bilingual; adding the languages your international guests actually speak widens the funnel cheaply. |
| **Abandoned-booking recovery** | €800 | Auto-email people who started booking but didn't finish. Typically recovers 5–15% of lost bookings. |
| **Loyalty / repeat-guest program** | €1,500 | Reward guests for coming back or trying new add-ons (Manzwine, Ramilo, Olaria MZ). Pairs with the referral system. |
| **Partner / affiliate portal** | €1,800 | Let your add-on partners (wineries, Tasco Galapito) and hotels/concierges refer bookings and track commission. Turns partners into a sales channel. |
| **GDPR & cookie-consent kit** | €600 | EU-compliant consent, privacy policy, data handling. Cheap insurance, and required for email marketing. |
| **Accessibility & performance audit** | €700 | WCAG + speed pass. Better for all users, and both feed SEO/GEO ranking. |

---

## 5. Suggested phasing (if you'd rather not do it all at once)

A natural, low-risk order — each phase pays for the next:

**Phase 1 — Foundation (get the base right)**
Website + GEO · CRM upgrade · Email/SMS notifications
→ _A professional, findable site and a back office that never drops a lead._
**≈ €5,700**

**Phase 2 — Revenue (start taking money online)**
Instant tour booking + Stripe · Wedding-car booking · Referral system
→ _Book-and-pay-now, a premium second product, and word-of-mouth that compounds._
**≈ €6,400** _(wedding bundle price applied)_

**Phase 3 — Growth engine (make it self-running)**
AI blog · Social generator + poster · Email marketing
→ _Content, social and re-marketing that run themselves and keep the funnel full._
**≈ €6,200**

You can start anywhere, but each phase makes the next more valuable.

---

## 6. Care plans (the long-term collaboration)

The build is the start; the partnership is where the value compounds. Pick a monthly plan — cancel
or change any time.

| | **Essential** | **Growth** ⭐ | **Partner** |
|---|---|---|---|
| **Price/month** | **€120** | **€340** | **€690** |
| Hosting, monitoring & backups | ✅ | ✅ | ✅ |
| Security updates & bug fixes | ✅ | ✅ | ✅ |
| Uptime + performance monitoring | ✅ | ✅ | ✅ |
| Small content/text changes | 1 / month | 4 / month | Unlimited |
| Monthly GEO/SEO review | — | ✅ | ✅ |
| Blog + social pipeline runs | — | ✅ | ✅ (managed) |
| Email-marketing campaign help | — | 1 / quarter | 1 / month |
| Monthly performance report | — | ✅ | ✅ |
| Priority support (same-day) | — | — | ✅ |
| Quarterly strategy / roadmap call | — | — | ✅ |
| Conversion-rate optimization | — | — | ✅ |

⭐ **Growth** is the recommended default once you're live — it keeps the content and GEO engines fed,
which is what actually drives bookings over time.

---

## 7. Running costs (third-party, billed at cost)

These are paid to the providers directly (or passed through with **no markup**). They scale with
usage, so a new business starts near the bottom of each range.

| Service | Typical cost | Notes |
|---------|--------------|-------|
| Hosting (Vercel + Neon database) | €0–40 / month | Free tiers cover early traffic |
| Stripe payments | ~1.5% + €0.25 per EU card | Only when you take money |
| Email sending | €0–20 / month | Free up to a few thousand emails |
| SMS (Twilio) | ~€0.07 per SMS | Only for reminders/alerts you send |
| AI generation (blog/social/email) | €10–40 / month | Depends on how much content you run |
| Social publishing service (optional) | €25–40 / month | Only if you skip manual platform approvals |

**Rough starting reality:** a fully-featured setup typically runs **€30–90/month** in third-party
costs early on, rising gently with volume.

---

## 8. What we need from you & rough timeline

- **From you:** brand assets (logo, photos), access to your domain, social accounts (for posting),
  and a Stripe account (we'll help set it up). Quick reviews of drafts as we go.
- **Timeline:** most single features land in **1–2 weeks**; a full phase in **3–5 weeks**. We agree
  exact dates once you choose.
- **Payment:** typically 50% to start a feature/phase, 50% on launch. Care plan billed monthly.

---

## 9. Your choice

Tick what you'd like to start with — any combination works, and the rest stay at these prices for
when you're ready.

- [ ] 1 · Website + GEO — €2,800
- [ ] 2 · AI blog — €1,900
- [ ] 3 · Tour booking + Stripe — €3,200
- [ ] 4 · Wedding-car booking — €1,900 _(€1,200 with #3)_
- [ ] 5 · Social generator + poster — €2,600
- [ ] 6 · Referral system — €1,600
- [ ] 7 · Email & SMS notifications — €1,400
- [ ] 8 · CRM pipeline — €1,500
- [ ] 9 · Email marketing — €1,700
- [ ] **Full suite — €15,900**
- [ ] Add-ons: _______________
- [ ] Care plan: ☐ Essential ☐ Growth ☐ Partner

---

_Let's build something that keeps working while you're out on the road. — [Your name]_

<!-- All prices are working figures at a mid-market rate and are fully editable.
     Commercial model: one-time build fee per feature + optional monthly care plan;
     third-party running costs billed at cost. Adjust tier/model as needed. -->
