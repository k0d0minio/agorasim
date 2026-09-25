# Stub: agorasim.pt leaves Amen — registrant their company, zone mirrored, Workspace untouched

- feature-slug: domain-transfer-tonight
- epic: go-live
- priority: P0
- size: M
- depends-on: none
- sequence: 1 of 9
- sources: Jamie 2026-09-11 (full transfer tonight, receiving registrar = the Portuguese registrar at pt.pt, zone on its DNS, registrant = Diogo & Rita's company); live DNS 2026-09-11 (`.icm/docs/launch-runbook.md` §1 — NS amenworld.com, MX/DKIM/DMARC Google, SPF includes Amen's `spf.webapps.net`, facebook TXT, legacy `mail.`/`webmail.`/`ftp.`); Workspace billed directly by Google (Q14, 2026-09-10); `web/scripts/dns-snapshot.sh`

> Cut for the night of 2026-09-11; the transfer had not run by 2026-09-18 (`agorasim.pt` still
> answers from Amen's nameservers and the old WordPress host). PR #100 carries the committed
> pre-transfer snapshot and the fixed diff tool; the runbook's Track T is unchanged. Slug kept.
>
> Re-dated 2026-09-25 (Jamie, `/day`): target night Sunday 2026-09-27, evening. Live DNS 2026-09-25:
> NS `ns1/ns2.vercel-dns.com`, MX still Google, apex A still `130.185.83.150` — the
> nameservers have moved (to Vercel DNS, not the registrar's zone this stub plans); whether the
> registrar transfer and the registrant change have run is unverified.

## Problem

Everything the client runs on — info@ mail, Calendar, Drive, the Business Profile —
resolves through the zone Amen serves. A registrar transfer does not move DNS records;
it moves who is allowed to set the nameservers. The moment the domain leaves Amen's
account, Amen may drop the zone, and the receiving registrar starts with an empty or
default one. The only way mail never blinks is a record-for-record mirror that is
verified *before* the nameservers move.

## Proposed change

Human work, tonight, per `.icm/docs/launch-runbook.md` § Track T (the meeting checklist)
— Jamie drives, Diogo & Rita hold the Amen login and the registrant identity. Session
work already shipped: `web/scripts/dns-snapshot.sh` prints the zone (via DNS-over-HTTPS,
or `--ns <server>` against the new registrar's nameservers before the switch) as a
sorted, diffable list. The sequence: snapshot → registrant/titular and expiry checked →
auth code from Amen → account at the new registrar, zone pre-created from the runbook's
mirror table (Vercel A/CNAME in place of the old WordPress host, everything else
verbatim) → transfer submitted → `dns-snapshot.sh --ns` diff against the live zone
shows only the two intended differences → nameservers switched → mail in/out of info@
proven → snapshot stored as the rollback record.

## Acceptance criteria (rough)

- [ ] Domain managed from the new registrar; registrant = the company (or the titular change is filed as a separate DNS.pt act, and that is written down)
- [ ] `dns-snapshot.sh` before/after differ only in `@ A` and `www CNAME` (and any Resend records added)
- [ ] Mail to and from info@agorasim.pt works after the switch; admin.google.com → Billing still shows the subscription active
- [ ] Rollback values (old NS, old A/CNAME) recorded in the runbook §5

## Prompt

In the agorasim repo, read `.icm/intake/go-live/domain-transfer-tonight.md` and
`.icm/docs/launch-runbook.md` § Track T. You never touch DNS, registrar or Workspace —
Jamie does, with Diogo & Rita present. Your work: run `web/scripts/dns-snapshot.sh`
before and (with `--ns`) during the transfer when Jamie asks, diff the outputs, name
every record that differs, and say whether the differences are the two intended ones.
When Jamie confirms the domain has landed and mail is proven, fill §5 of the runbook
with the observed before/after values and `git mv` this stub to
`.icm/intake/go-live/_done/` in a PR on a `claude/` branch. CI is the source of truth.
