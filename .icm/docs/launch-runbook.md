# Launch runbook — agorasim.pt moves registrar, then goes live; mail never blinks

> Rewritten **2026-09-11 (Fri)** for tonight's meeting with Diogo & Rita. It replaces the
> 2026-09-10 version (a Saturday A/CNAME switch inside Amen with the registrar transfer
> deferred). Jamie decided on 2026-09-11: **full registrar transfer tonight** to the
> Portuguese registrar at pt.pt, registrant = Diogo & Rita's company, zone hosted on the
> new registrar's DNS, and **the site goes live when the domain lands there** — not
> before. Stripe: Jamie's platform account is live-activated; Connect fee on from the
> first booking. PAX question answered: **adults only** (the code already does this).
>
> **Every checkbox in this file is a human's** (Jamie unless named). Sessions prepare,
> verify and report; they never tick a box, never touch DNS, registrar, Workspace or
> Stripe keys. No credential belongs in this file — "in the password manager" is the
> only allowed form.

## 0 · The one idea that makes tonight safe

A registrar transfer moves **who controls the nameservers**, not the records. Google
Workspace (Mail, Calendar, Drive, the Business Profile) resolves through the zone Amen
serves today; the moment the domain leaves Amen's account, Amen may drop that zone, and
the new registrar starts with an empty or default one. So the order is fixed:

1. **Snapshot** the live zone (`web/scripts/dns-snapshot.sh`).
2. **Pre-create an identical zone** at the new registrar — every record in §2 Track T's
   mirror table, verbatim, except `@ A` and `www CNAME`, which point at Vercel because
   the site follows the domain (nothing on the old WordPress site is kept — Q26/27).
3. **Verify** the pre-created zone against the live one **before** any nameserver change
   (`dns-snapshot.sh --ns <new-ns>`, or `--zonefile` on the registrar's export, vs the live
   snapshot). Two *intended* differences — `@ A` and `www CNAME` — plus two expected ones
   that are not the site moving: the `@ NS` rows (the new registrar answers with its own)
   and the Resend rows added in Track D. Everything else identical, mail records above all.
4. **Transfer**, then **switch nameservers** at the new registrar — that switch *is*
   go-live, so Production env must already be set (§2 Track G).
5. **Prove mail** in and out of info@agorasim.pt within minutes of the switch.

Workspace is **billed directly by Google** (Q14) — the transfer itself cannot cancel it.
Only a missing record can hurt it, and step 3 is what prevents that.

## 1 · Observed state, 2026-09-11

| Thing | State | Consequence |
|---|---|---|
| `agorasim.pt` registrar / DNS | Amen — NS `ns1/ns2.amenworld.com`, SOA `root.amen.fr`, serial 2025110705 | Domain is in Diogo & Rita's own Amen account (Q11); auth code comes from there |
| `agorasim.pt` A | `130.185.83.150` (old WordPress, live), TTL 900 | Replaced by Vercel's apex A in the mirrored zone |
| `www.agorasim.pt` | CNAME → `agorasim.pt.` | Replaced by Vercel's CNAME in the mirrored zone |
| MX | `1 aspmx.l.google.com`, `5 alt1`, `5 alt2`, `10 alt3`, `10 alt4` | Google Workspace mail — mirrored verbatim |
| TXT `@` | `v=spf1 include:spf.webapps.net include:_spf.google.com ~all` and `facebook-domain-verification=tr88umay1su0fk1udrsoazoya8y6sq` | Both mirrored verbatim (Amen's `spf.webapps.net` include is harmless; drop it in a later pass, not tonight) |
| `google._domainkey` TXT | `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCaHT0QfdWCoUn94IBgNNBKcXOafDFl7f7a9a5+crac+JDj5Q8U75UJhHAXcVjUJKtHknp2vkxPfSaFukWmowcxZ/WQiGHD+natRw++uhBRO79c4L/8kEYTvvASGVzffEskZb0/OSgvACxv+hdw0uVioH27RZQIg4nKmiUB8GeZNwIDAQAB` | Mirrored verbatim (one string; some panels split >255 chars — re-check with the snapshot script) |
| `_dmarc` TXT | `v=DMARC1; p=none; pct=100; ri=86400` | Mirrored verbatim |
| `mail.` CNAME → `mail-pt.securemail.pro.`, `webmail.` CNAME → `webmail-pt.setupdns.net.`, `ftp.` CNAME → `agorasim.pt.` | Amen legacy | Mirrored verbatim tonight (cheap; removing them is a later pass once nothing depends on them — Q13 says everything is on Workspace) |
| AAAA, CAA | none | nothing to mirror |
| Vercel project `agorasim` (team Kodominio) | `agorasim.pt` + `www.agorasim.pt` attached, serving at `agorasim.jamienisbet.com` | Vercel only needs DNS to point at it; www → apex redirect confirmed in the Domains panel |
| Stripe | Platform account **live-activated** (Jamie, 2026-09-11). Connect platform profile not done; Diogo & Rita's account does not exist; live webhook not created | § Track C tonight |
| Resend | `mail.jamienisbet.com` only, partially_failed; no `agorasim.pt` | § Track D — records go into the mirrored zone tonight |
| Code on `main` | Booking + Connect fee + refunds + cancellation + enquiry ack + terms/footer/privacy + Sentry + nightly backup + old-site redirects — all shipped (PRs #92–#97) | Nothing code-side gates the switch except the three app stubs in `.icm/intake/go-live/` |
| Pricing semantics | PAX = **adults only** (client answer, 2026-09-11) | `web/src/lib/pricing.ts` already keys tiers and minimums on adults — closed |

## 2 · Tracks

Legend: 🧑 Jamie · 👥 Diogo & Rita · 🤖 session (via PR) · ⛔ hard gate for real money

### Track T — tonight, the registrar transfer (with Diogo & Rita in the room)

**Before touching anything**
- [ ] 🧑 Neon → project `agorasim` → manual snapshot.
- [ ] 🤖/🧑 `web/scripts/dns-snapshot.sh > before.txt` — the live zone as Amen serves it. Keep the file. Taken 2026-09-17 and committed as `.icm/docs/dns/before-2026-09-17.txt`; re-verified record-for-record against §1, nothing had drifted. Re-run it on the night if more time passes.
- [ ] 🧑 Amen zone panel: screenshot/export as a second copy.
- [ ] 👥 Amen login works (password rotated 2026-08-29, in the password manager); the account shows `agorasim.pt` (Q11).
- [ ] 👥 Who is the current **titular** (registrant) at DNS.pt — Diogo, Rita, or already the company? (`whois agorasim.pt` / dns.pt lookup.) A registrar transfer keeps the titular; **changing the titular to the company is a separate DNS.pt act** (alteração de titular) done at the new registrar after the transfer, with the company's NIF and documents. Decide tonight which of the two happens first; write it down.
- [ ] 👥 Domain expiry date and Amen's auto-renew state noted. A `.pt` inside its last days before expiry, or renewed very recently, can be refused for transfer — if so, renew at Amen first.
- [ ] 👥 admin.google.com → Billing → Subscriptions: "managed by Google" (Q14 — confirm once more on screen). 2-step verification and a recovery phone on Diogo's super-admin (Q15).
- [ ] 👥 Any mailbox at Amen's `securemail.pro`? Log in once or confirm empty (Q13 says nothing there).

**The new registrar (the Portuguese registrar at pt.pt)**
- [ ] 👥 Account created in the company's name (Diogo & Rita hold the login; Jamie added as technical contact / delegated access if the panel supports it — Q10: Jamie manages, the client owns).
- [ ] 🧑 Confirm in its panel that it accepts **transfer-in of `.pt`** and hosts DNS zones (both required for this plan).
- [ ] 🧑 **Pre-create the zone** from the mirror table below. Every record verbatim from `before.txt` except the two Vercel rows. Add the Resend rows from Track D at the same time.
- [ ] 🧑 `web/scripts/dns-snapshot.sh --ns <the new registrar's nameserver> > mirror.txt` and `diff before.txt mirror.txt`. Expected differences: `agorasim.pt A`, `www.agorasim.pt CNAME`, `agorasim.pt NS` (the new registrar answers with its own), plus the added Resend rows. **Anything else different = fix before continuing.**
  - **`--ns` is Jamie's machine, not a session's** (corrected 2026-09-17). A Claude session's container has no authoritative DNS egress: port 53 is redirected to a local resolver that answers some names from cache and SERVFAILs others, so `--ns` there yields a *random subset* of the zone rather than an error. The script now preflights the SOA and refuses unless the nameserver answers with the `aa` flag, so this fails loudly instead of producing a plausible-looking partial `mirror.txt` — but the run still has to happen somewhere with real DNS egress.
  - A session **can** do the comparison from the registrar's **zone export**, which needs no DNS at all: `web/scripts/dns-snapshot.sh --zonefile export.txt > mirror.txt`. Paste or commit the export and the diff is the same check.
  - Either way the diff is trustworthy across machines now: TXT quoting, split DKIM strings, MX priority and sort locale are all normalised, so a difference in the output is a real difference in the zone.

Mirror table (name · type · value):

| Name | Type | Value |
|---|---|---|
| `@` | A | `76.76.21.21` (or the apex A the Vercel Domains panel shows) — **was** `130.185.83.150` |
| `www` | CNAME | `cname.vercel-dns.com.` — **was** `agorasim.pt.` |
| `@` | MX | `1 aspmx.l.google.com.` · `5 alt1.aspmx.l.google.com.` · `5 alt2.aspmx.l.google.com.` · `10 alt3.aspmx.l.google.com.` · `10 alt4.aspmx.l.google.com.` |
| `@` | TXT | `v=spf1 include:spf.webapps.net include:_spf.google.com ~all` |
| `@` | TXT | `facebook-domain-verification=tr88umay1su0fk1udrsoazoya8y6sq` |
| `google._domainkey` | TXT | the DKIM value in §1, unchanged |
| `_dmarc` | TXT | `v=DMARC1; p=none; pct=100; ri=86400` |
| `mail` | CNAME | `mail-pt.securemail.pro.` |
| `webmail` | CNAME | `webmail-pt.setupdns.net.` |
| `ftp` | CNAME | `agorasim.pt.` |
| `resend._domainkey` | TXT | as Resend prints it (Track D) |
| `send` | MX + TXT | as Resend prints them (Track D) |

**The transfer**
- [ ] 👥 At Amen: unlock the domain, request the **auth code** (código de autorização / EPP / chave de transferência). Amen may email it to the registrant contact — that address must be one Diogo or Rita can open tonight.
- [ ] 👥 At the new registrar: initiate transfer-in with the auth code. `.pt` transfers are processed by DNS.pt on the receiving registrar's request; a confirmation to the registrant contact is possible — approve it. Note what the panel says about timing (same day is common; the panel is the source of truth).
- [ ] 🧑 **Do not change nameservers yet** if the transfer is still pending and Amen still serves the zone: Amen keeps answering until the domain leaves its account, and the mirror is already verified. The switch is § Track G.
- [ ] 🧑 If the new registrar's panel changes nameservers automatically on transfer-in (some do): that is the go-live moment, so **Track G's env steps must be complete before you submit the transfer**. Check the panel's behaviour before pressing the button.

### Track C — Stripe, two accounts, one webhook ⛔ (tonight, with Diogo present)

**Jamie's platform account** — live-activated ✅ (2026-09-11).
- [ ] 🧑 Connect → **platform profile**: account type **Standard**, onboarding **hosted by Stripe**, loss liability with the connected account (matches the agreement §3). A questionnaire, minutes.
- [ ] 🧑 Developers → Webhooks → add **live** endpoint `https://agorasim.pt/api/stripe/webhook`, **"Listen to events on Connected accounts"**, events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.updated`. Signing secret → password manager.

**Diogo & Rita's account (does not exist yet)**
- [ ] 🧑 Connect → Accounts → **Create** → Standard → onboarding link to Diogo. He completes it on his phone: trading entity (company or ENI — whichever the business is registered as), NIF, IBAN, representative ID, website `https://agorasim.pt`. Record the `acct_…` id in the password manager.
- [ ] 👥 Stripe app on their phones, 2FA on, payouts **weekly**, Stripe receipt email **off** (Q8 — the site sends its own confirmation).
- [ ] 🧑 Decision on record (2026-09-10): launch with Connect, fee on from the first booking, Commission & Payments Agreement signed after. Setting `STRIPE_CONNECTED_ACCOUNT_ID` is the act that switches the fee on.

**If their account is not verified when the domain lands:** go live with `STRIPE_SECRET_KEY` **unset** in Production — `/reservar` then offers the enquiry form (the documented fallback in `web/src/lib/stripe.ts`); bookings are taken by hand from the Sales board (Calendar → day → *Registar e confirmar*, and from the board itself once `go-live/sales-board-manual-booking` ships). **Never** a `sk_test_` key on the live domain.

### Track D — email from the client's domain (records go into the mirrored zone)

- [ ] 🧑 Resend → Domains → add `agorasim.pt`, region **eu-west-1**. Copy the records it prints into the **new registrar's zone** (Track T mirror table) — DKIM TXT on `resend._domainkey`, MX + SPF TXT on `send`. Nothing on the apex changes.
- [ ] 👥 admin.google.com → Users → info@ → alternate emails: add `reservas@agorasim.pt` (Q17) so guest replies land.
- [ ] 🤖 `go-live/resend-sending-domain` (app half): reply-to `info@agorasim.pt` on every send; live values documented in `.env.example`.
- [ ] 🧑 After the nameserver switch: Resend shows **Verified**; then `BOOKING_EMAIL_FROM=Agorasim <reservas@agorasim.pt>` and `BOOKING_NOTIFICATION_EMAILS=info@agorasim.pt` in Vercel Production; redeploy.
- [ ] 🧑 One test booking email read in the info@ inbox: not spam, logo loads, links resolve to agorasim.pt.

### Track E — Diogo & Rita run it from their phones (tonight, on the sandbox address)

- [ ] 🧑 Admin accounts exist, both **owner** (`/admin/settings/users`, Q19/20); passwords changed on first sign-in.
- [ ] 👥 Install the admin PWA from `https://agorasim.jamienisbet.com/admin` tonight (Safari → Share → *Adicionar ao ecrã principal*; Chrome → *Instalar aplicação*). Reinstall from `agorasim.pt/admin` after the switch — the guide in the repo covers both OSes.
- [ ] 👥 Walkthrough on the phone: Sales board (detail, `BK-…` reference, tap-to-call), Calendar (close a day, close a slot, reopen, *Registar e confirmar* a manual booking), a cancel-and-refund on a sandbox booking, the catalogue (texts and visibility; **prices are read-only in the admin** — a price change goes through Jamie), Notifications, Users.
- [ ] 🧑 First-week rule agreed: every real booking is checked on the Sales board within the hour; Sentry alerts go to Jamie.

### Track G — go-live: when the domain sits at the new registrar ⛔

Order matters. Env first, DNS second, test third, announce last.

1. [ ] 🧑 Vercel → `agorasim` → Environment Variables, **Production scope only** (previews keep sandbox keys):
   `STRIPE_SECRET_KEY` (live `sk_live_…`, platform) · `STRIPE_WEBHOOK_SECRET` (the live endpoint's `whsec_…`) · `STRIPE_CONNECTED_ACCOUNT_ID` (`acct_…`, only once verified) · `NEXT_PUBLIC_SITE_URL=https://agorasim.pt` · `BOOKING_EMAIL_FROM` · `BOOKING_NOTIFICATION_EMAILS` · `SENTRY_DSN` · `BACKUP_BLOB_READ_WRITE_TOKEN` (second, private, EU Blob store — PR #96).
2. [ ] 🧑 Redeploy Production; confirm the deployment is the intended commit.
3. [ ] 🧑 Neon manual snapshot.
4. [ ] 🧑 At the new registrar: nameservers → the registrar's own (the zone verified in Track T). Nothing else changes. Note the time.
5. [ ] 🧑 Vercel → Domains: both `agorasim.pt` and `www.agorasim.pt` show **Valid configuration** and certificates issued (minutes once the new NS propagate; Amen's TTLs are 900 s, NS caching can take longer).
6. [ ] 🤖/🧑 `web/scripts/dns-snapshot.sh > after.txt`; `diff before.txt after.txt` shows only the intended rows.
7. [ ] 🧑 Send an email **to** info@agorasim.pt from an outside address and reply from it — mail path proven.
8. [ ] 🧑 Track H, then the €1 test. Only then tell Diogo & Rita the site is live.

### Track H — post-switch verification (same hour)

- [ ] `https://agorasim.pt` and `https://www.agorasim.pt` load over HTTPS; www redirects to apex.
- [ ] `/pt`, `/en`, `/pt/reservar`, `/en/reservar` render; checkout shows **no** test-mode label.
- [ ] `/sitemap.xml`, `/robots.txt`, canonicals and hreflang say `agorasim.pt`; old WordPress URLs 301 (PR #92).
- [ ] **€1 live booking** → Sales board → both emails from `reservas@agorasim.pt` → refund from the admin → both Stripe dashboards show the fee taken and returned; live webhook shows 200s.
- [ ] Resend domain Verified; Facebook domain verification still present (the TXT); Google Business Profile website link still `https://agorasim.pt`.
- [ ] admin.google.com → Billing unchanged; Calendar/Drive open normally.
- [ ] Google Search Console: add `agorasim.pt` (Domain property) and submit the sitemap.
- [ ] GitHub → Settings → Branches → protect `main`, require the CI check (real money now flows).

### Track J — old site and Amen, later

- [ ] 🧑 Amen hosting + legacy mail cancelled **only after** the transfer is complete, mail is proven elsewhere, and the `mail.`/`webmail.`/`ftp.` records and `spf.webapps.net` have been removed from the zone in a deliberate later pass. Never cancel the domain registration itself at Amen — the transfer moves it.

## 3 · Timeline

| When | Who | What |
|---|---|---|
| **Fri 11 Sep, before the meeting** | 🧑 | Neon snapshot. `dns-snapshot.sh > before.txt`. Resend: add `agorasim.pt`, note its records. Stripe: Connect platform profile + live webhook. Read Track T once. |
| **Fri 11 Sep, the meeting** | 👥 + 🧑 | Track T (registrar account, zone mirror, verify, auth code, transfer). Track C (Diogo's Stripe onboarding). Track D alias. Track E accounts + PWA + walkthrough. |
| Fri–Sat | 🤖 | `go-live/` app stubs: `resend-sending-domain` (app half), `wedding-event-enquiry-forms`, `sales-board-manual-booking`. |
| **When the domain lands** | 🧑 | Track G (env → NS switch → mail check), Track H, €1 test. Then announce. |
| First days live | 🧑 | Sales board + Stripe + Resend + Sentry watched; first real booking gets a call to Diogo/Rita. |
| Later | 🧑 | Titular change to the company if not done at transfer; Amen legacy records removed; Amen hosting cancelled (Track J). |

## 4a · Answers on record

2026-09-11 (Jamie, this rewrite):
| Q | Answer | Effect |
|---|---|---|
| Domain plan | **Full registrar transfer tonight**, receiving registrar = the Portuguese registrar at pt.pt, zone on its DNS, registrant = the company | Track T; the Saturday A/CNAME plan is retired |
| Go-live timing | **When the domain lands** at the new registrar, not before | Track G is the nameserver switch |
| Stripe | Platform account live-activated; Connect profile + their account tonight; **fee on from booking one** | Track C |
| Q5 PAX | **Adults only** | `pricing.ts` unchanged; stub closed |
| Quote flow | Public casamentos + eventos enquiry forms only; quoting by hand | `go-live/wedding-event-enquiry-forms` |
| Manual booking | Reachable from the Sales board too | `go-live/sales-board-manual-booking` |

2026-09-10 answers that still stand: Q2 weddings enquiry-only · Q3 Sentry shipped (PR #95), rate limiter post-launch · Q4 launch with Connect, agreement after (D16 waived in writing) · Q8 weekly payouts, receipt email off · Q9 no Neon upgrade (nightly export shipped, PR #96) · Q10 registrant stays the client, Jamie manages · Q11 domain in Diogo & Rita's own Amen account · Q13 everything on Workspace · **Q14 Workspace billed directly by Google** · Q15 Diogo super-admin, 2SV unknown · Q17 from `reservas@`, reply-to `info@` · Q18/22 team copy to `info@` · Q19/20 both owners · Q23 no RNAAT / insurance known (§4b) · Q24 Livro de Reclamações registration unknown · Q25 Stripe receipts are not faturas — accountant decides · Q26/27 nothing on the old site to keep.

## 4b · RNAAT and insurance — what the research says

- **RNAAT** (Registo Nacional dos Agentes de Animação Turística) is mandatory for selling
  guided tours (DL 108/2009 as amended). Searchable at
  `https://rnt.turismodeportugal.pt/RNT/Pesquisa_AAT.aspx` — Jamie or Diogo searches
  "Agorasim". If the business sold through a third-party platform it very probably has one.
- **Insurance**: civil liability + personal accident cover are conditions of RNAAT; if the
  registration exists, the policies exist — the terms and privacy pages want the names.
- **If neither exists**, that is a licensing gap in the business, not the website's. The
  site launches with "RNAAT: registo em curso" and the draft banner; Jamie says so once, in
  writing.
- **Livro de Reclamações Eletrónico**: mandatory for every supplier with a website; the
  footer link ships regardless (PR shipped). ADR: CACCL for a Mafra operator; the EU ODR
  platform was discontinued in July 2025 — not linked.

## 5 · Rollback values

**Before** is observed and committed: `.icm/docs/dns/before-2026-09-17.txt`, taken with
`dns-snapshot.sh` on 2026-09-17 and checked record-for-record against §1 — all 16 rows
identical to the 2026-09-11 reading, no drift, and no Resend or Vercel rows added yet.
That file is the rollback record; the table below is its summary.

**After** is left blank on purpose. The domain is still at Amen as of 2026-09-17
(`@ NS` = `ns1/ns2.amenworld.com`, `@ A` = `130.185.83.150`), so there is nothing observed
to write. It gets filled from `after.txt` once the nameservers are switched and mail is
proven — never from the mirror table, which is the intent rather than the result.

| Record | Before (observed 2026-09-11, re-verified 2026-09-17) | After (observed — fill after the switch) |
|---|---|---|
| Nameservers | `ns1.amenworld.com.`, `ns2.amenworld.com.` | _pending_ (expected: the new registrar's) |
| `agorasim.pt` A | `130.185.83.150` | _pending_ (expected: Vercel apex A) |
| `www.agorasim.pt` CNAME | `agorasim.pt.` | _pending_ (expected: `cname.vercel-dns.com.`) |
| MX (×5) | `1 aspmx` · `5 alt1` · `5 alt2` · `10 alt3` · `10 alt4` `.l.google.com.` | _pending_ (expected: identical) |
| SPF TXT | `v=spf1 include:spf.webapps.net include:_spf.google.com ~all` | _pending_ (expected: identical) |
| `google._domainkey` TXT | the 234-char DKIM value in §1, one string | _pending_ (expected: identical) |
| `_dmarc` TXT | `v=DMARC1; p=none; pct=100; ri=86400` | _pending_ (expected: identical) |
| facebook TXT | `facebook-domain-verification=tr88umay1su0fk1udrsoazoya8y6sq` | _pending_ (expected: identical) |
| `mail` · `webmail` · `ftp` CNAME | `mail-pt.securemail.pro.` · `webmail-pt.setupdns.net.` · `agorasim.pt.` | _pending_ (expected: identical) |
| AAAA, CAA | none | _pending_ (expected: none) |

Rollback while Amen still serves the zone = set nameservers back to Amen's at the new
registrar (Amen's zone is untouched by the transfer until Amen removes it). Rollback
after Amen has dropped the zone = the mirrored zone is the only zone; fix the record,
never the nameservers. Vercel keeps serving on `agorasim.jamienisbet.com` throughout.

## 6 · Never, on any day

- Never switch nameservers before `diff before.txt mirror.txt` shows only the intended rows.
- Never delete a TXT you do not recognise; never drop an MX.
- Never put a `sk_test_` key on the live domain's Production env; never a live key on previews.
- Never set `STRIPE_CONNECTED_ACCOUNT_ID` before their account is verified.
- Never cancel anything at Amen until the transfer is complete, mail is proven and the legacy records are consciously removed.
