# Go-live plan — from UAT to paid bookings on agorasim.pt

Written 2026-11-23 by the spike JAM-471. Each date is a target. Each blocker has one owner.
The steps are in `launch-runbook.md`. This page has the order, the owners and the dates.

Owners: **Jamie**, **Diogo**, **Rita**, **the accountant** (through Diogo). Amen has no step on
the path (see §2).

## 1. The answer

The shortest safe path has two milestones:

| Milestone | What the guest sees | Target date | Gate |
|---|---|---|---|
| **M1 — the new site on agorasim.pt** | The new site. The booking page shows the enquiry form. No payment | **Thu 2026-12-03** | The client's yes on UAT, release 1.1.0 promoted with its migrations |
| **M2 — paid bookings on agorasim.pt** | Stripe Checkout with live payments and the commission | **Wed 2026-12-09** | The RNAAT number, the insurance, the fatura rule, Diogo's Stripe account verified |

M1 and M2 can be on the same day if the M2 gates are ready by 2026-12-03.

The blog, social and SMS features (proposal features 2, 4 and 5b) go live after M1 and M2.
Jamie's decision, in writing, 2026-11-23: "Yes, after go-live" (Q1 of pull request #274).

Three facts make the path short:

1. **The DNS is already at Vercel.** The nameservers of `agorasim.pt` are `ns1/ns2.vercel-dns.com`
   since 2026-09-25 or earlier. The zone at Vercel DNS has every record of the Amen zone: the
   Google mail records, DKIM, DMARC, SPF and the Facebook TXT. Mail works through it today. The
   apex `A` still points at the old WordPress host (`130.185.83.150`), with a TTL of 60 s. The
   switch is thus two records in Vercel DNS. It needs no registrar act, no Amen act and no client
   in the room. The rollback is the same two records, and it takes about one minute.
2. **The app work of the old go-live epic is done.** Reply-to `info@` (#88), the wedding and
   event forms (#101) and the manual booking from the Sales board (#102) shipped in September.
3. **The site can go live with no payment.** With `STRIPE_SECRET_KEY` not set in Production,
   `/reservar` shows the enquiry form (`web/src/lib/stripe.ts`). Thus the domain switch does not
   wait for Stripe or the legal answers.

What is slow is not code. It is the client's legal facts (RNAAT, insurance, faturas), Diogo's
Stripe account, and the client's yes on UAT.

## 2. The state on 2026-11-23

Read only. Nothing was changed.

| Item | State | Source |
|---|---|---|
| `agorasim.pt` | Old WordPress (`LiteSpeed`, `130.185.83.150`). `www` redirects to it | `curl`, `dig` |
| Nameservers | `ns1/ns2.vercel-dns.com`. The zone is in the Vercel team Kodominio | `vercel domains inspect` |
| Registrar | Vercel says "Third Party". The `.pt` whois shows no registrar and no titular. Expiry 2027-08-05 | `whois`, `vercel domains ls` |
| Zone at Vercel | MX ×5 Google, `google._domainkey`, `_dmarc`, SPF with `spf.webapps.net`, Facebook TXT, `mail`/`webmail`/`smtp`/`ftp` CNAMEs and `_autodiscover` SRV of Amen, CAA (`letsencrypt.org`, `sectigo.com`, `pki.goog`), `uat` CNAME, a wildcard `*` ALIAS to Vercel | `vercel dns ls` |
| Vercel project `agorasim` | Only `uat.agorasim.pt` is attached. `agorasim.pt` shows "not configured properly" | `vercel domains inspect` |
| `prod.agorasim.pt` | `404 DEPLOYMENT_NOT_FOUND`. The wildcard resolves it, but the project does not have it | `curl` |
| Production (current) | `agorasim.jamienisbet.com`, the build of 2026-09-24 | `vercel inspect` |
| Production (staged) | A Ready build for each merge to `main`. The last one is of 2026-11-23 11:32 | `vercel ls --environment production` |
| Release | Pull request #214 (1.1.0), open. Tag `v1.0.0` (2026-10-28) was never promoted. `promote` and `migrate-production.yml` never ran | `gh` |
| Production database (Neon `agorasim`) | 27 migrations applied (`0000`–`0026`, last 2026-09-20). `main` has 42. **15 migrations wait** (`0027`–`0041`). 3 admin users. 5 bookings of 2026-09-05 or before (3 confirmed, 2 expired) | read-only SQL |
| UAT database (Neon `uat-agorasim`) | 42 migrations applied | read-only SQL |
| Production env (names only) | Stripe keys, `NEXT_PUBLIC_SITE_URL`, `BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS` and `ADMIN_PASSWORD` share one value with Preview. **Not set:** `RESEND_API_KEY`, `SENTRY_DSN`, `GOOGLE_PLACES_API_KEY`, `BACKUP_BLOB_READ_WRITE_TOKEN` | `vercel env ls` |
| UAT env (names only) | Also no `RESEND_API_KEY`, `SENTRY_DSN` or `GOOGLE_PLACES_API_KEY` | `vercel env ls` |
| Resend for `agorasim.pt` | No `resend._domainkey` record, no `send` MX or TXT. Not set up | `dig` |
| Stripe | Not read: this session has no Stripe access. The proof in test mode is JAM-472 (PR #267, no proof yet) | sibling spike |
| Legal | RNAAT, insurance, Livro de Reclamações and faturas are open. Without an RNAAT number, no paid booking is legal (JAM-473, PR #273) | sibling spike |
| GitHub | The repo is public. `main` has no branch protection | `gh api` |

## 3. Blockers

**M1 — the new site on agorasim.pt.** All rows must be done before the switch.

| # | Blocker | Owner | Target | Depends on |
|---|---|---|---|---|
| B1 | Send the client questions of §6 in one message | Jamie | 2026-11-24 | — |
| B2 | Answer Q1 in writing: can the blog, social and SMS features follow after go-live? Done 2026-11-23: yes | Jamie | 2026-11-23 | — |
| B3 | Say if the site can go live before the seats-and-holds fixes (JAM-290 to JAM-294) | Diogo | 2026-11-27 | B1 |
| B4 | Attach `prod.agorasim.pt` to the project as a production domain, or correct `.icm/environments.md` (JAM-289) | Jamie | 2026-11-24 | — |
| B5 | Set `VERCEL_TOKEN` and `VERCEL_TEAM` for `promote.sh status`. It prints no `SETUP:` line. Tick the boxes of `.icm/setup/` that are true (JAM-289) | Jamie | 2026-11-24 | — |
| B6 | Decide the home of the production migration. Make sure the repo secret `DATABASE_URL` is the direct connection string of the Neon project `agorasim` (JAM-288) | Jamie | 2026-11-25 | — |
| B7 | Resend: add `agorasim.pt` (eu-west-1). Put its records in the Vercel DNS zone. The apex does not change, so this is safe now. Resend shows Verified | Jamie | 2026-11-25 | — |
| B8 | Add `reservas@agorasim.pt` as an alternate address of `info@` in Google Workspace | Diogo | 2026-11-27 | B1 |
| B9 | Give Production its own values: split the shared Stripe, site URL, email and admin variables from Preview. Set `NEXT_PUBLIC_SITE_URL=https://agorasim.pt`. Remove `STRIPE_SECRET_KEY` from Production for M1. Add `RESEND_API_KEY`, `SENTRY_DSN`, `GOOGLE_PLACES_API_KEY`, `BACKUP_BLOB_READ_WRITE_TOKEN` | Jamie | 2026-11-30 | B7 |
| B10 | Decide what happens to the 5 bookings of September in the production database (test data or real) | Jamie | 2026-11-30 | — |
| B11 | Make a new staged production build after B9: merge to `main`, or redeploy the commit that UAT serves. A build keeps the env of its build time | Jamie | 2026-11-30 | B9 |
| B12 | Test the batch on `uat.agorasim.pt` and say yes. Then Jamie runs `promote.sh approve` | Diogo | 2026-11-30 | B3, B11 |
| B13 | `release`, then `migrate-production.yml` with the tag (15 migrations), then `promote` | Jamie | 2026-12-01 | B5, B6, B12 |
| B14 | Close the days that are known to be off, on production (`/admin` → Calendar). The calendar is open by default | Rita | 2026-12-02 | B13 |
| B15 | The switch: attach `agorasim.pt` and `www.agorasim.pt` to the project. In Vercel DNS, delete the apex `A` and point `www` at Vercel. Then runbook Track H | Jamie | **2026-12-03** | B4, B7, B8, B13, B14 |

**M2 — paid bookings on agorasim.pt.** All rows must be done before the first live payment.

| # | Blocker | Owner | Target | Depends on |
|---|---|---|---|---|
| B16 | Give the RNAAT number, or say that there is none | Diogo | 2026-11-27 | B1 |
| B17 | Give the insurer and the policy numbers (civil liability, personal accident) | Diogo | 2026-11-27 | B1 |
| B18 | Say if the business is registered in the Livro de Reclamações Eletrónico | Diogo | 2026-11-27 | B1 |
| B19 | Say who sells: the sole trader or the company. Stripe, the terms and the invoices use it | Diogo | 2026-11-27 | B1 |
| B20 | Say how a fatura is made for each paid booking (by hand, or invoicing software) | the accountant | 2026-12-02 | B1 |
| B21 | The commission proof in test mode on a connected test account (JAM-472) | Jamie | 2026-11-27 | — |
| B22 | Stripe: the Connect platform profile and the live webhook on `https://agorasim.pt/api/stripe/webhook` | Jamie | 2026-12-01 | B21 |
| B23 | Complete the Stripe Standard onboarding on the phone, with Jamie on a call (ID, NIF, IBAN, entity). Stripe shows the account verified | Diogo | 2026-12-04 | B19, B22 |
| B24 | Fill the `TODO(legal)` lines of the terms and the privacy page, and remove the draft banner (build ticket, needs a release) | Jamie | 2026-12-07 | B16–B20 |
| B25 | Live Stripe keys and `STRIPE_CONNECTED_ACCOUNT_ID` in Production only. New staged build. The client's yes, `release`, `promote` | Jamie | 2026-12-08 | B23, B24 |
| B26 | The €1 live booking, its refund, both Stripe dashboards (runbook Track H). Then tell Diogo and Rita that payments are live | Jamie | **2026-12-09** | B15, B25 |

**After go-live.** These do not block M1 or M2.

| # | Item | Owner | Target |
|---|---|---|---|
| A1 | Say where the domain is registered today, and who the titular at DNS.pt is | Diogo | 2026-11-27 |
| A2 | Move the registration out of Amen, and change the titular to the business if needed (runbook Track T) | Diogo | 2027-01-31 |
| A3 | Remove the Amen records (`mail`, `webmail`, `smtp`, `ftp`, `_autodiscover`, `spf.webapps.net`), then cancel Amen hosting. Never cancel the registration before A2 | Jamie | 2027-01-31 |
| A4 | Protect `main` with a ruleset that requires `ci`. The repo is public, so the free plan permits it | Jamie | 2026-11-24 |
| A5 | Google Search Console and the sitemap (JAM-478) | Jamie | 2026-12-10 |

## 4. If the answers change the path

| Answer | Effect |
|---|---|
| B3: seats-and-holds first | Seats-and-holds is on UAT 2026-12-04 at the earliest. B12 moves to 2026-12-08, B13 to 2026-12-09, **M1 to 2026-12-10**. With late client answers to the van questions: 2026-12-17 |
| B16: no RNAAT number | M1 does not change. **M2 waits** for the inscription at Turismo de Portugal. Its date is not known. The insurance comes first (JAM-473) |
| B20: a fatura from invoicing software for each booking | M2 does not wait if the accountant accepts faturas by hand for the first weeks. An integration is a new request of 4–6 days (JAM-473) |
| B23: Stripe does not verify the account by 2026-12-08 | M2 moves. The site stays on the enquiry form. Never a `sk_test_` key in Production |
| Q1: all six features first (not chosen, 2026-11-23) | M1 and M2 would wait for the blog (JAM-475), social (JAM-477, about 9 days of build plus the client's Meta access) and SMS (JAM-476). Estimate: not before 2027-01-18 |

## 5. Rules on the path

- The promotion never builds again. A build keeps the env values of its build time. Thus set
  each Production value **before** the staged build that you promote (B9, B11, B25).
- Merge nothing between the client's yes and the promotion. A merge after the yes joins the
  batch (`.icm/_system/features/uat.md`).
- Each release with a migration runs `migrate-production.yml` before `promote`
  (`.icm/local/ROUTES.md`). Release 1.1.0 has 15 for production.
- Production moves only on Jamie's word.

## 6. Questions for the client

Jamie sends them in one message (B1). The default is what the plan does with no answer.

1. Can the new site go live on agorasim.pt before the seats-and-holds fixes (the van for the open
   group, the unpaid booking that holds a seat)? Default: yes, the fixes follow in the next
   release.
2. What is the RNAAT number of the business? If there is none, did the inscription start?
   Default: none. Paid bookings wait.
3. Which insurer, and which policy numbers, for civil liability and personal accident?
   Default: none. Paid bookings wait.
4. Is the business registered in the Livro de Reclamações Eletrónico? Default: no. Diogo
   registers before M2.
5. Who sells the tours: Diogo as a sole trader, or a company? Give the name and the NIF that
   the guest must see. Default: the sole trader of the info form.
6. How does the accountant want the fatura of each paid booking? Default: by hand, from the
   Stripe payout list, each week.
7. Which day before 2026-12-04 can Diogo do the Stripe set-up on his phone, on a 30-minute call
   (ID card, NIF, IBAN at hand)? Default: Wed 2026-12-02, 18:00.
8. Can Diogo add `reservas@agorasim.pt` as an alternate address of `info@` in Google Workspace?
   Default: Jamie sends the steps, Diogo does it by 2026-11-27.
9. Where is the domain `agorasim.pt` registered today (Amen or another registrar), and who is the
   titular? Default: still at Amen, titular Diogo.
10. Which days in December and January are you off? Default: Rita closes them in the admin
    before 2026-12-02.

## 7. Not known at the end of the time box

- Who moved the nameservers to Vercel, and when. The registrar and the titular (A1).
- Whether `RESEND_API_KEY` and `SENTRY_DSN` are set as shared team variables. The project lists
  do not have them. If they are not set, UAT sends no email today (`web/src/lib/email.ts`
  logs and skips).
- The modes of the Stripe keys in Production. The session read names only.
- Whether `promote.sh` picks a redeploy (B11) as the build of the commit. If not, B11 is a
  merge to `main`.
- Whether the 5 bookings in the production database are tests (B10).
- The Stripe state: the platform profile, the live webhook, the connected account.
