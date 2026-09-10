# Launch runbook — agorasim.pt goes live, mail never blinks, data stays intact

> Written 2026-09-10 (Thu) for a **Saturday 2026-09-12 morning** go-live. The earlier
> runbook this replaces was deleted before this repo's history begins and could not be
> recovered; this one is rebuilt from the live DNS, the Vercel/Neon/Resend/Stripe state
> observed on 2026-09-10 and the tickets in `.icm/intake/launch-cutover/`.
>
> **Every checkbox in this file is a human's** (Jamie unless named). Sessions prepare,
> verify and report; they never tick a box, never touch DNS, registrar or Stripe keys.
> No credential belongs in this file — "in the password manager" is the only allowed
> form.

## 0 · The one idea that makes Saturday possible

**Going live and moving the domain are two different operations.** Saturday needs only
a DNS change *inside Amen*, where the domain already lives: point `@` and `www` at
Vercel and touch nothing else. The registrar transfer (Amen → Jamie's registrar
account) is a separate track that takes days, carries the Google Workspace risk, and
must **not** be attempted before Saturday. Decoupling the two is what protects
info@agorasim.pt.

## 1 · Observed state, 2026-09-10

| Thing | State | Consequence |
|---|---|---|
| `agorasim.pt` registrar / DNS | Amen (`ns1/ns2.amenworld.com`, SOA `root.amen.fr`) | DNS edits happen in Amen's panel (the deleted runbook called it controlpanel.pro) |
| `agorasim.pt` A | `130.185.83.150` (Amen LiteSpeed host), TTL 900 | The **old WordPress site is live again** (200, not the 403 the tickets record) |
| `www.agorasim.pt` | CNAME → `agorasim.pt`, old site 301s www→apex | Apex is canonical; keep that |
| MX | Google Workspace (`aspmx.l.google.com` + alt1–4) | **Never touched.** This is the client's mail |
| TXT `@` | `v=spf1 include:spf.webapps.net include:_spf.google.com ~all` + `facebook-domain-verification=…` | Keep both. `spf.webapps.net` is Amen's mail — harmless, remove only after Amen mailboxes are confirmed empty |
| `google._domainkey` TXT, `_dmarc` (`p=none`) | Present | Keep. DMARC `p=none` means a new sender cannot bounce mail |
| `mail.agorasim.pt`, `webmail.agorasim.pt` | Amen's securemail.pro | Legacy Amen mail hosting still wired — **may hold old mailboxes** (question Q13) |
| Vercel project `agorasim` (team Kodominio) | `agorasim.pt` and `www.agorasim.pt` **already attached**; serving at `agorasim.jamienisbet.com` | Vercel is waiting for DNS; nothing to add in Vercel except the www→apex redirect choice |
| Neon project `agorasim` (eu-central-1) | **Free plan, 6 h point-in-time history, no snapshot schedule** | Back-office data has a 6-hour undo window. Fix before real money (Track A) |
| Resend | One domain: `mail.jamienisbet.com`, status **partially_failed**; no `agorasim.pt` | Confirmation emails today go out from Jamie's domain, and that domain is not fully verified |
| Stripe in code | Direct charges on a connected account + 4% application fee, refund webhooks, all built and sandbox-tested (30/30 + 52/52 pricing) | Live needs: Jamie's platform account live-activated, Diogo & Rita's Standard account, live webhook, three env values |
| `STRIPE_CONNECTED_ACCOUNT_ID` | Unset (sandbox on Jamie's account) | The moment it is set, the 4% fee is taken — **D16 says only after the agreement is signed** |
| `site.domain` | Hardcoded `https://agorasim.pt` (canonicals/JSON-LD); emails + Stripe return URLs already follow the serving origin | `env-driven-domain` still open but the live domain *is* the hardcoded one, so it stops being wrong on Saturday |
| Terms of sale, Livro de Reclamações/ADR footer, privacy recipients (Stripe, Resend) | **Not built** | Legal gate for taking real money (Track B) |
| Error tracking, shared rate-limit store | Not built | Observability gate — decide how much rides Saturday (Q3) |
| `pax-tier-semantics` | Blocked on the client's PAX-vs-adults answer | Real-money mispricing risk on children in groups (Q5) |
| Admin | Owner/collaborator roles; invite = temporary password handed over in person; installable PWA (manifest still English, no offline) | Diogo & Rita's phones need accounts + the install walkthrough (Track E) |

## 2 · Tracks, in dependency order

Legend: 🧑 Jamie · 👥 Diogo & Rita · 🤖 session (via PR) · ⛔ hard gate for real money

### Track A — data safety floor (before anything else changes)

- [ ] 🧑 Neon → project `agorasim` → **create a manual snapshot** now, and again on Friday evening and immediately before Saturday's DNS change.
- [ ] 🧑 Decide the plan (Q9): Neon *Launch* gives 7-day history + scheduled snapshots; free keeps 6 h. Recommendation: upgrade before the first live euro.
- [ ] 🤖 `launch-cutover/db-backup-floor`: a nightly logical export of `bookings`, `tour_requests`, `admin_users`, `audit_log`, quotes to Vercel Blob, so a restore never depends on one vendor.
- [ ] 🧑 Google Workspace: super-admin signs in at admin.google.com and runs **Data Export** (Takeout for organisations) *or* per-account Takeout for info@ — a cold copy before any domain work. This is a belt; the domain track (Track I) is the braces.

### Track B — code that must merge before real money ⛔

Order is by legal weight, then by size. All are `launch-cutover/` stubs; each ships as its own `claude/` PR with CI green.

1. [ ] 🤖 `terms-of-sale-page` — `/pt/termos` + `/en/terms`, seller identity from info PDF §1.1 (RNAAT slot "pending"), 48 h cancellation, weather policy, Art. 16(l) withdrawal exclusion, **terms-acceptance line above the pay button**, footer link.
2. [ ] 🤖 `footer-compliance` — Livro de Reclamações Eletrónico link + ADR entity (Lisbon consumer-arbitration centre; verify current competence) + EU ODR link, PT/EN.
3. [ ] 🤖 `privacy-refresh` — recipients gain Stripe + Resend; the two false claims corrected; draft banner stays.
4. [ ] 🤖 `env-driven-domain` — `site.domain` from `NEXT_PUBLIC_SITE_URL`; previews stop advertising agorasim.pt canonicals.
5. [ ] 🤖 `resend-sending-domain` (new stub) — app side: `BOOKING_EMAIL_FROM` documented as `Agorasim <reservas@agorasim.pt>`, reply-to `info@agorasim.pt`; DNS side is Track D.
6. [ ] 🤖 `admin-accounts-and-phones` (new stub) — Portuguese manifest (`lang`, name, shortcuts), drop the portrait lock, a one-page PT install-and-first-week guide for Diogo & Rita.
7. [ ] 🤖 `old-site-redirects` (new stub) — 301s for the WordPress URLs that will die on Saturday (`/sobre/`, `/contactos/`, `/eventos/`, `/en/`, `/politica-de-privacidade/`, `/politica-de-cookies/`, `/centro-de-arbitragem/`) onto the new routes.
8. [ ] 🤖 `error-tracking` — at minimum the three silent paths alert Jamie (orphan paid session, failed confirmation email, catalogue fallback baked into ISR). Scope call Q3.
9. [ ] 🤖 `rate-limit-store` — Neon-backed store for `/admin/login` + public forms. Scope call Q3.
10. [ ] 🤖 `triage/enquiry-fallback-unverified` — prove the Stripe-unset fallback on a preview **before Saturday**, because it is the Saturday plan if Stripe activation slips (§2 Track C, last bullet).
11. [ ] 🤖 `booking-live/pax-tier-semantics` — unblocks only on the client's answer (Q5). Without it, live pricing on children-in-groups is wrong in the client's favour or against it.

Branch protection on `main` (CI required) goes on the moment real money can flow:
- [ ] 🧑 GitHub → Settings → Branches → protect `main`, require the CI check.

### Track C — Stripe, two accounts, one webhook ⛔

**Jamie's platform account (already exists, sandbox in use):**
- [ ] 🧑 Activate **live mode**: business details, identity, IBAN. Stripe can clear this in minutes or days — start today.
- [ ] 🧑 Connect → **complete the platform profile** (Stripe blocks live connected accounts until the platform questionnaire is done). Loss liability: the connected account (Standard) bears disputes — matches the agreement §3.
- [ ] 🧑 Developers → Webhooks → add **live** endpoint `https://agorasim.pt/api/stripe/webhook`, **"Listen to events on Connected accounts"**, events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.updated`. Signing secret → password manager.

**Diogo & Rita's account (does not exist yet):**
- [ ] 👥 Create a Stripe account for the trading entity (Agorasim Vintage, NIF 234840919) — needs: company/sole-trader details, representative ID, IBAN, website `https://agorasim.pt`, business description. Diogo or Rita must be present with ID documents; Jamie can sit beside them but the account is **theirs**.
- [ ] 🧑 Link it as a **Standard connected account** on Jamie's platform (Connect → Accounts → connect an existing account, or an OAuth link). Record the `acct_…` id.
- [ ] 👥 Stripe dashboard on their phones: Stripe app installed, 2FA on, payout schedule reviewed (default daily rolling; weekly is calmer for reconciliation).
- [ ] 🧑 Sign-off on D16: **the fee switches on with the `acct_` id.** Either the Commission & Payments Agreement is signed before the id is set, or Jamie explicitly waives D16 for the launch (Q4). There is no "connected but no fee" mode in the code.

**Vercel env (Production scope only — previews keep sandbox keys):**
- [ ] 🧑 `STRIPE_SECRET_KEY` = live `sk_live_…` (platform)
- [ ] 🧑 `STRIPE_WEBHOOK_SECRET` = the live endpoint's `whsec_…`
- [ ] 🧑 `STRIPE_CONNECTED_ACCOUNT_ID` = `acct_…` (only after the D16 line above)
- [ ] 🧑 `NEXT_PUBLIC_SITE_URL` = `https://agorasim.pt`
- [ ] 🧑 Redeploy production.

**The €1 test (after DNS, Track H):** a real card, cheapest possible booking, confirmed on the Sales board, both emails received, then refunded from the admin — fee taken and returned visible on **both** Stripe dashboards.

**If live activation has not cleared by Friday 18:00:** go live anyway with `STRIPE_SECRET_KEY` **unset** in Production. `/reservar` then offers the enquiry form (the documented fallback); bookings are taken by hand until the key arrives. **Never** put the sandbox key on the live domain — a labelled test checkout on agorasim.pt would let real guests "pay" with a test card.

### Track D — email from the client's domain (DNS at Amen, no apex changes)

- [ ] 🧑 Resend → Domains → add `agorasim.pt`, region **eu-west-1** (Ireland; keeps the EEA-transfer story simple).
- [ ] 🧑 In Amen DNS add exactly the records Resend prints — they land on `resend._domainkey.agorasim.pt` (DKIM TXT) and on the return-path subdomain `send.agorasim.pt` (one MX, one SPF TXT). **No record on the apex changes**, so Google's MX/SPF/DKIM are untouched.
- [ ] 🧑 Wait for "Verified" in Resend; then `BOOKING_EMAIL_FROM=Agorasim <reservas@agorasim.pt>` and `BOOKING_NOTIFICATION_EMAILS=info@agorasim.pt,<Diogo>,<Rita>` in Vercel Production; redeploy.
- [ ] 🧑 Send one test booking email and read it in the info@ Workspace inbox: not spam, logo loads, links resolve to agorasim.pt.
- [ ] 🧑 Fix or remove `mail.jamienisbet.com` (partially_failed) so the sandbox/preview emails keep working.

### Track E — Diogo & Rita run it from their phones

- [ ] 🧑 Create their admin accounts (`/admin/settings/users`): both **owner** role (Q20), temporary passwords handed over by voice/WhatsApp-disappearing, changed on first sign-in. Session lasts 7 days; the password manager on their phones should store it.
- [ ] 👥 Install the admin PWA: Safari → `https://agorasim.pt/admin` → Share → *Adicionar ao ecrã principal* (iOS) / Chrome menu → *Instalar aplicação* (Android). Log in once inside the installed app.
- [ ] 👥 Walk through, on the phone, with Jamie on a call: Sales board (a booking's detail, reference `BK-…`, guest phone tap-to-call), Calendar (close a day, close a slot, reopen), a cancel-and-refund on the €1 test, the catalogue (price edit → live at once), Notifications, Users.
- [ ] 👥 Turn on email notifications for `info@` on their phones (the team copy of every paid booking lands there).
- [ ] 🧑 Agree the first-week rule: **every real booking is checked on the Sales board within the hour**, because there is no SMS and (until `error-tracking` lands) no alarm.

### Track F — Friday evening, DNS prepared

- [ ] 🧑 In Amen DNS, lower TTL on `agorasim.pt` A and `www` CNAME to **300**. (Current 900 — the lower value means a rollback propagates in 5 minutes.)
- [ ] 🧑 Screenshot / export the full Amen zone. Store it with the rollback values (§9).
- [ ] 🧑 Vercel → project → Domains: confirm `agorasim.pt` is the primary and `www.agorasim.pt` **redirects** to it (matches the old site's behaviour and `site.domain`).
- [ ] 🧑 Confirm Production env is complete (Track C + D values) and the latest production deployment is the intended commit.
- [ ] 🧑 Neon manual snapshot.

### Track G — Saturday morning, the switch (≈ 30 minutes of work, 60 of watching)

Order matters. Do it at a quiet hour (08:00 before the 10:00 departure window opens).

1. [ ] 🧑 Amen DNS: change `agorasim.pt` **A** from `130.185.83.150` → Vercel's apex A (`76.76.21.21`, or the value the Vercel domain panel shows). Change **nothing else**.
2. [ ] 🧑 Amen DNS: change `www.agorasim.pt` from `CNAME agorasim.pt` → `CNAME cname.vercel-dns.com` (or Vercel's shown value).
3. [ ] 🧑 Do **not** change nameservers. Do **not** delete any TXT, MX, DKIM, DMARC or `mail.`/`webmail.` record.
4. [ ] 🧑 Wait for Vercel to show both domains "Valid configuration" and the certificate issued (minutes).
5. [ ] 🧑 Verify (Track H). If anything fails: rollback (§5) — one record back, 5 minutes.
6. [ ] 🧑 Send an email **to** info@agorasim.pt from an outside address and reply from it: mail path proven unaffected.

### Track H — post-switch verification (Saturday, same hour)

- [ ] `https://agorasim.pt` and `https://www.agorasim.pt` load the new site over HTTPS; www redirects to apex.
- [ ] `/pt`, `/en`, `/pt/reservar`, `/en/reservar` render; checkout shows **no** "test mode" label.
- [ ] `/sitemap.xml`, `/robots.txt`, canonicals and hreflang say `agorasim.pt`.
- [ ] Old WordPress URLs 301 to the new routes.
- [ ] **€1 live booking** → Sales board → both emails from `reservas@agorasim.pt` → refund from admin → both Stripe dashboards show fee taken and returned.
- [ ] Stripe live webhook shows 200s for the test.
- [ ] Mail to and from info@agorasim.pt still works (Track G step 6).
- [ ] Google Search Console: add `agorasim.pt` (Domain property, verified via the existing Google TXT if Workspace verification is reusable, else one new TXT) and submit the sitemap. Google Business Profile website link still `https://agorasim.pt`.
- [ ] Draft banners: privacy + terms stay "draft" until §1.1 answers + counsel — decide the wording of the banner on a live site (Q23).

### Track I — registrar transfer to Jamie's account (**after** launch, not before)

This is the track that can break Google Workspace. Do it slowly, after the site is stable, with these answered first: Q10–Q13.

Pre-conditions (all must be true):
- [ ] 🧑 Google Workspace billing is **direct with Google**, not through Amen as reseller. Check: admin.google.com → Billing → Subscriptions → "managed by". If it is a reseller subscription, **transfer the subscription to direct billing first** (Google provides a transfer token flow) — moving the domain away from a reseller can cancel the subscription and, after the suspension period, delete the data.
- [ ] 🧑 Who is Workspace super-admin is known and that login works on a device Diogo/Rita control. Recovery phone/email set.
- [ ] 🧑 Any mailbox at Amen's `securemail.pro` (`mail.agorasim.pt`) has been logged into, exported (IMAP to Workspace or .mbox) or confirmed empty.
- [ ] 🧑 The full Amen zone is exported (Track F) — the receiving registrar **may not import records**, and some reset to their defaults on transfer-in.
- [ ] 🧑 Registrant identity decided (Q10): recommendation — **the registrant stays Agorasim Vintage / Diogo & Rita**; Jamie's registrar account becomes the managing account with Jamie as admin/tech contact. Transferring *ownership* to Jamie changes who legally holds the client's brand and is not what "manage it for them" needs.
- [ ] 🧑 Domain expiry date and Amen contract state known (a domain inside 15 days of expiry, or one renewed in the last 60 days, can be refused for transfer).
- [ ] 🧑 Receiving registrar chosen and it supports `.pt` transfers (Vercel Domains does **not** register `.pt`; use a `.pt`-capable registrar — e.g. the registrar Jamie already uses for his own domains if it lists `.pt`, or DNS.pt-accredited ones).

Execution (`.pt` mechanics, DNS.pt rules):
- [ ] 👥 Registrant unlocks the domain at Amen and obtains the **auth code** (chave de transferência / EPP code). Amen may need the registrant's account login — Diogo & Rita hold it (password rotated 2026-08-29, in the password manager).
- [ ] 🧑 Pre-create the zone at the new registrar **identical to the Amen export**, before initiating — same MX, SPF, DKIM, DMARC, facebook TXT, Resend records, Vercel A/CNAME.
- [ ] 🧑 Initiate the transfer at the receiving registrar with the auth code; registrant approves the DNS.pt confirmation email (goes to the registrant contact — confirm that address is one Diogo/Rita read).
- [ ] 🧑 After completion: nameservers — either keep `ns1/ns2.amenworld.com` until Amen's hosting contract ends (nothing changes), or switch to the new registrar's nameservers **only when the pre-created zone is verified record-for-record** (`dig` each record type against the new NS before switching).
- [ ] 🧑 Verify mail in/out of info@, Vercel domain still valid, Resend still verified, Facebook domain verification still present.
- [ ] 🧑 Cancel Amen hosting + legacy mail **only after** the WordPress content/media export (Track J) and after mail is confirmed elsewhere; never cancel the domain registration itself at Amen (the transfer moves it).

### Track J — old site decommission

- [ ] 👥/🧑 Export WordPress: media library (`/wp-content/uploads/` — the awards badges and old photos the media-estate tickets want) and page content, via Amen's file manager or WP export, **before** hosting is cancelled. The site is unreachable from the public once DNS moves, but Amen hosting keeps it alive at the IP for a few weeks of grace.
- [ ] 🤖 `old-site-redirects` shipped (Track B) — old URL → new route map lives in `web/next.config.*`.
- [ ] 🧑 Facebook/Instagram bio links and Google Business Profile still point at `https://agorasim.pt` (they do; the target simply changes).

## 3 · Timeline

| When | Who | What |
|---|---|---|
| **Thu 10 Sep** | 🧑 | Answer the question pack (§4 below). Start Stripe live activation + Connect platform profile. Add `agorasim.pt` to Resend and its DNS records at Amen. Neon snapshot. Workspace billing check. |
| Thu–Fri | 🤖 | Track B PRs in order 1→7 (legal + domain + email + admin + redirects), then 8–10 as scope allows. |
| **Fri 11 Sep** | 👥 + 🧑 | Diogo & Rita: Stripe account created and connected; admin accounts created; PWA installed; phone walkthrough on the sandbox. PAX answer given. Agreement signed or D16 waived in writing. |
| Fri 18:00 | 🧑 | Go/no-go on live keys (Track C last bullet). Production env set. TTLs lowered. Zone exported. Snapshot. |
| **Sat 12 Sep 08:00** | 🧑 | Track G, then Track H. €1 test. Mail check. |
| Sat–Sun | 🧑 | Watch the Sales board + Stripe + Resend logs hourly; first real booking gets a phone call from Jamie to Diogo/Rita to confirm they saw it. |
| Week of 14 Sep | 🤖/🧑 | Remaining Track B items; Neon plan; Search Console; **Track I registrar transfer begins only after Q10–Q13 are answered and the pre-conditions hold**. |

## 4 · Open before Saturday — the question pack

Answers go to Jamie; sessions read them here or in the deal folder. Numbered so answers can be one line each.

**Scope / go-no-go**
- Q1. Is "live by Saturday" *real payments on agorasim.pt*, or *the new site on agorasim.pt with bookings taken however Stripe allows*? The second is achievable regardless; the first depends on Stripe clearing two account activations in ~36 h.
- Q2. Weddings/events (quote flow, payment links) stay enquiry-only for launch — confirm.
- Q3. Of `error-tracking` (Sentry, free tier, server-only) and `rate-limit-store` (Neon table), which must ride Saturday? Recommendation: error-tracking yes (a silent orphaned payment is the worst launch-week failure), rate-limit-store the week after.

**Stripe / money**
- Q4. D16: will the Commission & Payments Agreement be signed by Friday? If not: launch with the connected account **and fee on** (waiving D16 in writing), launch on the platform account **without Connect** (money lands in Jamie's account — not acceptable for a live business), or launch with Stripe unset. There is no fee-off Connect mode.
- Q5. PAX vs adults in tiers and minimums — has the client answered? This is the one open real-money correctness bug.
- Q6. Diogo & Rita's Stripe account: sole trader (ENI) or company? Which NIF/IBAN? Who is the representative with ID on Friday? Do they already have any Stripe account (e.g. from the third-party platform)?
- Q7. Does Jamie's platform account already have **live** mode activated (has it ever taken a real payment)? Has the Connect platform profile ever been completed?
- Q8. Payout cadence for their account (daily rolling vs weekly) and whether Stripe's own receipt email should be on (the site already sends a confirmation; two emails per booking is noise).

**Data**
- Q9. Neon: upgrade to Launch (≈$19/mo, 7-day restore + scheduled snapshots) before the first live euro — yes/no, and on whose card.

**Domain / registrar**
- Q10. "Transfer to me" — registrant ownership to Jamie, or Jamie's registrar account managing a domain that stays registered to Agorasim Vintage? Recommendation is the latter.
- Q11. Which receiving registrar, and does it handle `.pt`? Do you know the domain's expiry date and whether Amen auto-renews?
- Q12. Do Diogo & Rita have a working Amen login (post-rotation) and access to the registrant contact email DNS.pt will write to?
- Q13. Amen's own mail (`mail.agorasim.pt` → securemail.pro): are there mailboxes there? Was info@ ever hosted at Amen before Workspace? Anything still forwarding?

**Google Workspace**
- Q14. Is the Workspace subscription billed by Google directly or through Amen (reseller)? (admin.google.com → Billing.) This single fact decides whether Track I is safe.
- Q15. Who is super-admin, how many users, which edition, and is 2-step verification with recovery set on that account?
- Q16. Anything else in Workspace tied to the domain: Google Calendar bookings, Drive with the wedding photos, Google Business Profile ownership, Meet links on the old site?

**Email**
- Q17. Send confirmations from `reservas@agorasim.pt` with reply-to `info@agorasim.pt` — agree? Should `reservas@` also exist as a Workspace alias so guest replies to it land somewhere?
- Q18. Team-copy recipients for every paid booking: `info@` only, or Diogo's and Rita's personal addresses too?

**Admin / phones**
- Q19. Do Diogo and Rita already have admin accounts on the current deployment, and who is the seeded owner today?
- Q20. Both owners, or one owner + one collaborator? Owner can add/remove users and see the audit log.
- Q21. iPhone or Android, each? (Install steps differ; Safari is required for the iOS install.)
- Q22. Do they want the team-copy emails, or is the Sales board check enough for week one?

**Legal / content**
- Q23. RNAAT number, insurance provider + policy, invoicing method (§1.1 blanks): any of them in hand? The privacy and terms pages launch with draft banners without them — acceptable wording for a live site: "Versão em revisão" or no banner and a dated `lastUpdated` only?
- Q24. Livro de Reclamações: is Agorasim Vintage registered on livroreclamacoes.pt? The footer can only link.
- Q25. Who issues the fatura for each booking (self-invoicing question) — decided for Saturday, or bookings are invoiced by hand from the Stripe export for now?

**Old site**
- Q26. Anything on the WordPress site that has not been carried over and must not vanish on Saturday (awards badges, a page, a wedding gallery, a PDF)? Its file manager is the only route once DNS moves.
- Q27. Does anyone hold the WordPress admin login, and should the media library be exported before Saturday?

## 5 · Rollback values (fill in Friday from the Amen zone export)

| Record | Value before | Value after |
|---|---|---|
| `agorasim.pt` A | `130.185.83.150` (TTL 900 → lowered to 300 Friday) | Vercel apex A |
| `www.agorasim.pt` CNAME | `agorasim.pt.` | `cname.vercel-dns.com.` |
| Everything else | unchanged | unchanged |

Rollback = restore the two "before" values. With TTL 300 the old site is back within 5 minutes; Vercel keeps serving on `agorasim.jamienisbet.com` throughout, so bookings never stop being possible at the temporary address.

## 6 · Never, on any day

- Never change the nameservers to go live. Never delete a TXT you do not recognise.
- Never put a `sk_test_` key on the live domain's Production env.
- Never set `STRIPE_CONNECTED_ACCOUNT_ID` before the D16 decision is written down.
- Never start the registrar transfer before Q14 is answered "direct with Google" (or the subscription has been moved to direct billing).
- Never cancel anything at Amen until the WordPress export, the mailbox check and the transfer are all done.
