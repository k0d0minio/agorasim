# Launch runbook — agorasim.pt goes live on Vercel; mail never blinks

> Brought up to date **2026-11-23** by the spike JAM-471. The order, the owners and the dates
> are in `go-live-plan.md`. This page has the steps.
>
> What changed since the version of 2026-09-11: the nameservers of `agorasim.pt` moved to
> Vercel DNS (2026-09-25 or earlier), and the zone there has every record of the Amen zone.
> Thus the go-live is two records in Vercel DNS (Track G). The registrar transfer out of Amen
> is no longer on the path. It follows after go-live (Track T). The `go-live/` epic of
> `.icm/intake/` was deleted on 2026-10-23 (Jamie's decision). Its app stubs shipped (#88,
> #101, #102). Git history holds the stubs.
>
> **Every checkbox in this file is a human's** (Jamie unless named). Sessions prepare,
> verify and report. They never tick a box, and never touch DNS, the registrar, Workspace or
> Stripe keys. No credential belongs in this file. "In the password manager" is the only
> allowed form.

## 0 · The one idea that makes the switch safe

The zone at Vercel DNS already serves the Google Workspace records (MX, DKIM, DMARC, SPF).
Mail works through it today. The switch changes only the apex `A` and the `www` CNAME. It
does not change the nameservers or a mail record. The TTL of both records is 60 s, so the
rollback takes about one minute.

1. **Snapshot** the live zone (`web/scripts/dns-snapshot.sh > before.txt`).
2. **Switch** the two records (Track G).
3. **Diff** (`dns-snapshot.sh > after.txt`, `diff before.txt after.txt`): exactly the two rows.
4. **Prove mail** in and out of info@agorasim.pt within minutes of the switch.

Workspace is **billed directly by Google** (Q14). The DNS host cannot cancel it. Only a
missing record can hurt it, and step 3 is what finds that.

## 1 · Observed state, 2026-11-23

| Thing | State | Consequence |
|---|---|---|
| Nameservers | `ns1/ns2.vercel-dns.com`. The zone is in the Vercel team Kodominio. Vercel says registrar "Third Party". The `.pt` whois shows no registrar and no titular. Expiry 2027-08-05 | The switch is in Vercel DNS. The registrar and the titular are Track T, after go-live |
| `agorasim.pt` A | `130.185.83.150` (old WordPress, live), TTL 60 | Deleted at the switch. The apex then takes Vercel's default ALIAS |
| `www.agorasim.pt` | CNAME → `agorasim.pt.`, TTL 60 | Pointed at Vercel at the switch |
| `*` | ALIAS → Vercel (the default of a Vercel zone) | Resolves `prod.agorasim.pt` and every other name to Vercel |
| MX | `1 aspmx.l.google.com`, `5 alt1`, `5 alt2`, `10 alt3`, `10 alt4` | Google Workspace mail. Never changes |
| TXT `@` | `v=spf1 include:spf.webapps.net include:_spf.google.com ~all` and `facebook-domain-verification=tr88umay1su0fk1udrsoazoya8y6sq` | Keep both. Drop `spf.webapps.net` in Track J |
| `google._domainkey` TXT | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCaHT0QfdWCoUn94IBgNNBKcXOafDFl7f7a9a5+crac+JDj5Q8U75UJhHAXcVjUJKtHknp2vkxPfSaFukWmowcxZ/WQiGHD+natRw++uhBRO79c4L/8kEYTvvASGVzffEskZb0/OSgvACxv+hdw0uVioH27RZQIg4nKmiUB8GeZNwIDAQAB` | Keep |
| `_dmarc` TXT | `v=DMARC1; p=none; pct=100; ri=86400` | Keep |
| `mail`, `webmail`, `smtp`, `ftp` CNAMEs, `_autodiscover._tcp` SRV | Amen legacy | Keep until Track J |
| CAA | `letsencrypt.org`, `sectigo.com`, `pki.goog` | Vercel's certificates are permitted |
| `resend._domainkey`, `send` | none | Track D adds them |
| Vercel project `agorasim` (team Kodominio) | Only `uat.agorasim.pt` is attached. Production serves at `agorasim.jamienisbet.com` (build of 2026-09-24). `prod.agorasim.pt` answers 404 | Track G attaches the apex and `www` |
| Production database (Neon `agorasim`) | 27 migrations applied (`0000`–`0026`). `main` has 42 | Release 1.1.0 runs `migrate-production.yml` before `promote` |
| Production env | The Stripe, site URL, email and admin values are shared with Preview. `RESEND_API_KEY`, `SENTRY_DSN`, `GOOGLE_PLACES_API_KEY`, `BACKUP_BLOB_READ_WRITE_TOKEN` are not set | Track G step 1 |
| Stripe | Platform account live-activated (2026-09-11). The Connect platform profile, the client's account and the live webhook: not verified | Track C |
| Code on `main` | Booking, the Connect fee, refunds, cancellation, the enquiry forms, the manual booking, reply-to `info@`, Sentry, the nightly backup, old-site redirects | Nothing code-side gates the switch. The legal texts gate paid bookings (§4b) |
| Pricing semantics | PAX = **adults only** (client answer, 2026-09-11) | `web/src/lib/pricing.ts` keys tiers and minimums on adults |

## 2 · Tracks

Legend: 🧑 Jamie · 👥 Diogo & Rita · 🤖 session (via PR) · ⛔ hard gate for real money

### Track C — Stripe, two accounts, one webhook ⛔

**Jamie's platform account** — live-activated ✅ (2026-09-11).
- [ ] 🧑 Connect → **platform profile**: account type **Standard**, onboarding **hosted by Stripe**, loss liability with the connected account (matches the agreement §3).
- [ ] 🧑 Developers → Webhooks → add two **live** endpoints with the URL `https://agorasim.pt/api/stripe/webhook` and these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.updated`.
  - The **platform** endpoint: "Listen to events on **Your account**". Its signing secret is `STRIPE_WEBHOOK_SECRET`. It carries the refunds and late events of the bookings taken before Connect.
  - The **Connect** endpoint: "Listen to events on **Connected accounts**". Its signing secret is `STRIPE_CONNECT_WEBHOOK_SECRET` (JAM-501). It carries the bookings on Diogo & Rita's account.
  - Both signing secrets → password manager. The route accepts an event that either secret verifies, and rejects all other events with 400.

**Diogo & Rita's account (does not exist yet)**
- [ ] 🧑 Connect → Accounts → **Create** → Standard → onboarding link to Diogo. He completes it on his phone: trading entity (company or ENI, as the business is registered), NIF, IBAN, representative ID, website `https://agorasim.pt`. Record the `acct_…` id in the password manager.
- [ ] 👥 Stripe app on their phones, 2FA on, payouts **weekly**, Stripe receipt email **off** (Q8 — the site sends its own confirmation).
- [ ] 🧑 Decision on record (2026-09-10): launch with Connect, fee on from the first booking, Commission & Payments Agreement signed after. Setting `STRIPE_CONNECTED_ACCOUNT_ID` is the act that switches the fee on.

**If their account is not verified at the switch:** go live with `STRIPE_SECRET_KEY` **not set** in Production. `/reservar` then offers the enquiry form (the fallback in `web/src/lib/stripe.ts`). Bookings are taken by hand from the Sales board or the Calendar (*Registar e confirmar*). **Never** a `sk_test_` key on the live domain.

### Track D — email from the client's domain

The zone is at Vercel DNS, so these records can go in now. Nothing on the apex changes.

- [ ] 🧑 Resend → Domains → add `agorasim.pt`, region **eu-west-1**. Put the records it prints into the Vercel DNS zone of `agorasim.pt`: DKIM TXT on `resend._domainkey`, MX + SPF TXT on `send`. Resend shows **Verified**.
- [ ] 🧑 `RESEND_API_KEY` in Vercel Production and UAT (the key in the password manager).
- [ ] 👥 admin.google.com → Users → info@ → alternate emails: add `reservas@agorasim.pt` (Q17) so guest replies land.
- [ ] 🧑 `BOOKING_EMAIL_FROM=Agorasim <reservas@agorasim.pt>` and `BOOKING_NOTIFICATION_EMAILS=info@agorasim.pt` in Vercel Production. Reply-to `info@agorasim.pt` is the default of the app (#88).
- [ ] 🧑 One test booking email read in the info@ inbox: not spam, logo loads, links resolve to agorasim.pt.

### Track E — Diogo & Rita run it from their phones

- [ ] 🧑 Admin accounts exist, both **owner** (`/admin/settings/users`, Q19/20). Passwords changed on first sign-in.
- [ ] 👥 Install the admin PWA from `https://agorasim.pt/admin` after the switch (Safari → Share → *Adicionar ao ecrã principal*; Chrome → *Instalar aplicação*).
- [ ] 👥 Walkthrough on the phone: Sales board (detail, `BK-…` reference, tap-to-call), Calendar (tap a day or the first and last day of a stretch → *Bloquear dia inteiro*, *Só manhã*, *Desbloquear*; *Ver dia* → *Nova reserva* → *Registar e confirmar* a manual booking), a cancel-and-refund on a sandbox booking, the catalogue (texts and visibility; **prices are read-only in the admin** — a price change goes through Jamie), Notifications, Users.
- [ ] 🧑 First-week rule agreed: every real booking is checked on the Sales board within the hour. Sentry alerts go to Jamie.
- [ ] 👥 **After the promotion of release 1.1.0 and before the switch:** the calendar is open by default (shipped, `.icm/intake/_done/open-calendar/`). Every departure that nobody closed is on sale online, two days ahead to six months out. Diogo & Rita close the days they know they are off **on production** (Calendar → tap the day, or its first and last day for a stretch → *Bloquear dia inteiro*), after they try it on UAT. Phone and cash bookings ignore the notice, the window and the closed days. Capacity still applies.

### Track P — the promotion of the release

Follow `.icm/_system/features/uat.md` and `.icm/local/ROUTES.md`. Each step on Jamie's word.

1. [ ] 🧑 Set every Production value of Track G step 1 **before** the staged build that you promote. A build keeps the env of its build time, and the promotion never builds again. After a change of env, make a new staged build (a merge to `main`).
2. [ ] 👥 The client tests the batch on `uat.agorasim.pt` and says yes. 🧑 `promote.sh approve --by "<who>"`. Merge nothing after the yes.
3. [ ] 🧑 Neon → project `agorasim` → manual snapshot.
4. [ ] 🧑 `promote.sh release`. Then `gh workflow run migrate-production.yml -f tag=<v*>`, and read its result (`db:migrate`, `db:verify` green).
5. [ ] 🧑 `promote.sh run --tag <v*>`. Read the workflow `promote`. Production (`agorasim.jamienisbet.com`) serves the tag.

### Track G — go-live: the switch in Vercel DNS ⛔

Order matters. Env first, release second, DNS third, test fourth, announce last.

1. [ ] 🧑 Vercel → `agorasim` → Environment Variables, **Production scope only** (previews and UAT keep sandbox keys). Split each variable that Production shares with Preview today.
   `NEXT_PUBLIC_SITE_URL=https://agorasim.pt` · `BOOKING_EMAIL_FROM` · `BOOKING_NOTIFICATION_EMAILS` · `ADMIN_PASSWORD` · `RESEND_API_KEY` · `SENTRY_DSN` · `GOOGLE_PLACES_API_KEY` · `BACKUP_BLOB_READ_WRITE_TOKEN` (second, private, EU Blob store — PR #96).
   For paid bookings only: `STRIPE_SECRET_KEY` (live `sk_live_…`, platform) · `STRIPE_PUBLISHABLE_KEY` (the matching live `pk_live_…`; a mode that disagrees with the secret key turns `/reservar` to the enquiry form) · `STRIPE_WEBHOOK_SECRET` (the live platform endpoint's `whsec_…`) · `STRIPE_CONNECT_WEBHOOK_SECRET` (the live Connect endpoint's `whsec_…`, Track C) · `STRIPE_CONNECTED_ACCOUNT_ID` (`acct_…`, only once verified). Without them, remove the Stripe values from Production: the site takes enquiries.
2. [ ] 🧑 Track P. Production serves the intended tag.
3. [ ] 🤖/🧑 `web/scripts/dns-snapshot.sh > before.txt`.
4. [ ] 🧑 Vercel → `agorasim` → Domains: add `agorasim.pt` and `www.agorasim.pt` to the production environment, with `www` → apex redirect.
5. [ ] 🧑 Vercel → Domains → `agorasim.pt` → DNS records: delete the apex `A 130.185.83.150`. Change `www` to `CNAME cname.vercel-dns.com.` Nothing else changes. Note the time.
6. [ ] 🧑 Vercel → Domains: both names show **Valid configuration** and certificates issued.
7. [ ] 🤖/🧑 `web/scripts/dns-snapshot.sh > after.txt`; `diff before.txt after.txt` shows only the two rows.
8. [ ] 🧑 Send an email **to** info@agorasim.pt from an outside address and reply from it — mail path proven.
9. [ ] 🧑 Track H. With live keys: the €1 test. Only then tell Diogo & Rita the site is live.

### Track H — post-switch verification (same hour)

- [ ] `https://agorasim.pt` and `https://www.agorasim.pt` load over HTTPS; www redirects to apex.
- [ ] `/pt`, `/en`, `/pt/reservar`, `/en/reservar` render. With live keys, checkout shows **no** test-mode label. Without them, the enquiry form shows.
- [ ] `/sitemap.xml`, `/robots.txt`, canonicals and hreflang say `agorasim.pt`; old WordPress URLs 301 (PR #92).
- [ ] With live keys: **€1 live booking** → Sales board → both emails from `reservas@agorasim.pt` → refund from the admin → both Stripe dashboards show the fee taken and returned; live webhook shows 200s.
- [ ] Resend domain Verified; Facebook domain verification still present (the TXT); Google Business Profile website link still `https://agorasim.pt`.
- [ ] admin.google.com → Billing unchanged; Calendar/Drive open normally.
- [ ] Google Search Console: add `agorasim.pt` (Domain property) and submit the sitemap.
- [ ] GitHub → Settings → Rules: a ruleset on `main` that requires the `ci` check. The repo is public, so the free plan permits it.

### Track T — the registrar and the titular (after go-live)

The nameservers are already at Vercel. A registrar transfer keeps the nameservers and moves
who can change them. Thus it does not touch the site or the mail, if the nameservers stay
`ns1/ns2.vercel-dns.com`.

- [ ] 👥 Say where `agorasim.pt` is registered today (Amen or another registrar) and who the **titular** at DNS.pt is (Diogo, Rita, or the company).
- [ ] 👥 If it is still at Amen: open an account at the Portuguese registrar at pt.pt in the business's name (Q10: Jamie manages, the client owns). At Amen, unlock the domain and get the **auth code**. At the new registrar, start the transfer-in with the code, and keep the nameservers `ns1/ns2.vercel-dns.com`.
- [ ] 👥 A change of titular to the company is a separate DNS.pt act (alteração de titular), with the company's NIF and documents, at the registrar after the transfer.
- [ ] 🤖/🧑 `dns-snapshot.sh` before and after the transfer: no difference.

### Track J — old site and Amen, later

- [ ] 🧑 Remove the Amen records from the zone in a deliberate pass: `mail`, `webmail`, `smtp`, `ftp`, `_autodiscover._tcp`, and `include:spf.webapps.net` in the SPF.
- [ ] 🧑 Cancel Amen hosting and legacy mail **only after** that pass and Track T. Never cancel the domain registration at Amen: the transfer moves it.

## 3 · Timeline

The dated plan, with an owner for each blocker, is `go-live-plan.md`.

## 4a · Answers on record

2026-09-11 (Jamie):
| Q | Answer | Effect |
|---|---|---|
| Domain plan | Full registrar transfer to the Portuguese registrar at pt.pt, registrant = the company | Overtaken: the nameservers are at Vercel. The transfer is Track T, after go-live (2026-11-23) |
| Go-live timing | When the domain lands at the new registrar | Overtaken: the go-live is the switch in Vercel DNS (Track G) |
| Stripe | Platform account live-activated; Connect profile + their account; **fee on from booking one** | Track C |
| Q5 PAX | **Adults only** | `pricing.ts` unchanged |
| Quote flow | Public casamentos + eventos enquiry forms only; quoting by hand | Shipped (#101) |
| Manual booking | Reachable from the Sales board too | Shipped (#102) |

2026-10-23 (Jamie): the `go-live/` epic leaves the backlog. The go-live steps stay in this
runbook, which Jamie drives.

2026-09-10 answers that still stand: Q2 weddings enquiry-only · Q3 Sentry shipped (PR #95), rate limiter post-launch · Q4 launch with Connect, agreement after (D16 waived in writing) · Q8 weekly payouts, receipt email off · Q9 no Neon upgrade (nightly export shipped, PR #96) · Q10 registrant stays the client, Jamie manages · Q11 domain in Diogo & Rita's own Amen account (not verified since the nameserver change) · Q13 everything on Workspace · **Q14 Workspace billed directly by Google** · Q15 Diogo super-admin, 2SV unknown · Q17 from `reservas@`, reply-to `info@` · Q18/22 team copy to `info@` · Q19/20 both owners · Q23 no RNAAT / insurance known (§4b) · Q24 Livro de Reclamações registration unknown · Q25 Stripe receipts are not faturas — accountant decides · Q26/27 nothing on the old site to keep.

## 4b · RNAAT, insurance, faturas

- **RNAAT** (Registo Nacional dos Agentes de Animação Turística) is mandatory for selling
  guided tours (DL 108/2009 as amended). Searchable at
  `https://rnt.turismodeportugal.pt/RNT/Pesquisa_AAT.aspx`. The spike JAM-473 (PR #273) found
  that a paid booking is not legal without the number, and that the site must show it.
  "Registo em curso" is not compliant. Thus no live Stripe key goes into Production before the
  number is on the terms page.
- **Insurance**: civil liability and personal accident cover are conditions of the RNAAT. The
  terms and privacy pages want the insurer and the policy numbers.
- **Faturas**: a Stripe receipt is not a fatura. The accountant says how each paid booking
  gets one (JAM-473).
- **Livro de Reclamações Eletrónico**: mandatory for every supplier with a website. The footer
  link shipped. The business must be registered. ADR: CACCL for a Mafra operator. The EU ODR
  platform was discontinued in July 2025 — not linked.

## 5 · Rollback values

| Record | Before (Vercel DNS, 2026-11-23) | After the switch |
|---|---|---|
| Nameservers | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` | unchanged |
| `agorasim.pt` A | `130.185.83.150`, TTL 60 | none (Vercel's default ALIAS) |
| `www.agorasim.pt` CNAME | `agorasim.pt.`, TTL 60 | `cname.vercel-dns.com.` |
| Everything else | as `before.txt` | identical |

Rollback of the switch = add the apex `A 130.185.83.150` again and set `www` back to
`agorasim.pt.`. The old WordPress host still serves until Amen hosting is cancelled (Track J).
Rollback of a release = `rollback.sh` (`.icm/_system/features/uat.md`). The database does not
go back.

## 6 · Never, on any day

- Never change the nameservers or a mail record at the switch.
- Never delete a TXT you do not recognise; never drop an MX.
- Never put a `sk_test_` key on the live domain's Production env; never a live key on previews or UAT.
- Never set `STRIPE_CONNECTED_ACCOUNT_ID` before their account is verified.
- Never put live Stripe keys in Production before the RNAAT number is on the terms page.
- Never cancel anything at Amen before Track T is complete and the legacy records are consciously removed.
