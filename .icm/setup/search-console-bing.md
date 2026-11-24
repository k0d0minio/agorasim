# Setup: Google Search Console and Bing Webmaster Tools, verified by DNS

- where: Vercel → Domains → `agorasim.pt` (the DNS zone), Google Search Console, Bing
  Webmaster Tools
- who: Jamie
- ticket: JAM-502

Agorasim has no web analytics (decision of 2026-09-18). These two tools are the main measure
of search after the go-live. The monthly check of `.icm/docs/geo-baseline.md` reads them.

The nameservers of `agorasim.pt` are already at Vercel DNS. Thus the DNS verification works
before the go-live. The sitemap step works only after the go-live, because before it the
apex serves the old WordPress site.

## Order with the go-live

- Do part A **before** the go-live (Track G of `.icm/docs/launch-runbook.md`). Then the
  snapshot `before.txt` of Track G has the new TXT record, and the diff of Track G still
  shows only the two rows.
- If you do part A after the go-live, do it after the snapshot `after.txt`.
- Do part B and part C in the same hour as Track H, after the switch.

## Part A — Google Search Console, Domain property (any time before the go-live)

1. [ ] Open Google Search Console. Add property → **Domain** → `agorasim.pt`. Google shows a
   TXT record `google-site-verification=<value>`. Copy the value.
2. [ ] Vercel → Domains → `agorasim.pt` → DNS Records → Add. Name: empty (the apex `@`).
   Type: `TXT`. Value: the value of step 1. TTL: default. Add a **new** record. Do not
   change the existing apex TXT records (SPF and `facebook-domain-verification`).
3. [ ] Check that the record is live:
   `dig +short TXT agorasim.pt @ns1.vercel-dns.com` shows the `google-site-verification`
   line, the SPF line and the Facebook line.
4. [ ] In Search Console, click **Verify**. If Google says that it cannot see the record,
   wait 10 minutes and click again.

Do not delete the TXT record after the verification. Google checks it again. If the record
goes, the property stops being verified.

## Part B — the sitemap in Search Console (after the go-live)

5. [ ] Check that `https://agorasim.pt/sitemap.xml` opens and lists `agorasim.pt` URLs
   (Track H).
6. [ ] Search Console → the property `agorasim.pt` → Sitemaps → enter `sitemap.xml` →
   Submit.

## Part C — Bing Webmaster Tools (after part B)

7. [ ] Open Bing Webmaster Tools. Sign in. Choose **Import your sites from GSC**. Give Bing
   read access to the Google account of part A. Select `agorasim.pt` → Import. The import
   verifies the site and copies the sitemap of part B. Bing adds no DNS record.
8. [ ] Bing → Sitemaps: check that `https://agorasim.pt/sitemap.xml` is in the list. If it
   is not there, Submit sitemap → `https://agorasim.pt/sitemap.xml`.

If the import is not possible, use the DNS method of Bing: add the CNAME record that Bing
shows in the Vercel DNS zone, then click Verify. Then do step 8.

## Done when

- [ ] Search Console shows the property `agorasim.pt` as verified.
- [ ] Search Console → Sitemaps shows `sitemap.xml` with the status **Success** and a
  number of discovered URLs. Google can need some days to read it.
- [ ] Bing Webmaster Tools shows `agorasim.pt` as verified.
- [ ] Bing → Sitemaps shows `https://agorasim.pt/sitemap.xml` with the status
  **Success**. Bing can need some days to read it.
