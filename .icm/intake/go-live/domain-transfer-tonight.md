# Stub: agorasim.pt leaves Amen tonight — registrant their company, zone mirrored, Workspace untouched

- feature-slug: domain-transfer-tonight
- epic: go-live
- priority: P0
- size: M
- depends-on: none
- sequence: 1 of 6
- sources: Jamie 2026-09-11 (full transfer tonight, receiving registrar = the Portuguese registrar at pt.pt, zone on its DNS, registrant = Diogo & Rita's company); live DNS 2026-09-11 (`.icm/docs/launch-runbook.md` §1 — NS amenworld.com, MX/DKIM/DMARC Google, SPF includes Amen's `spf.webapps.net`, facebook TXT, legacy `mail.`/`webmail.`/`ftp.`); Workspace billed directly by Google (Q14, 2026-09-10); `web/scripts/dns-snapshot.sh`

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

## Session note — 2026-09-17

Still open: **the transfer has not happened.** `dns-snapshot.sh` on 2026-09-17 shows
`agorasim.pt` still at Amen (`@ NS` = `ns1/ns2.amenworld.com`, `@ A` = `130.185.83.150`),
record-for-record identical to the 2026-09-11 reading in the runbook §1 — no drift, and no
Resend or Vercel rows added yet. So none of the three closing conditions (domain landed,
mail proven, §5 filled with observed values) is met, and this stub stays where it is.

Shipped this session instead, so the gate is trustworthy when the night comes:

- The snapshot is committed as the rollback record: `.icm/docs/dns/before-2026-09-17.txt`.
- `dns-snapshot.sh` had three defects that all corrupted the gating diff rather than
  failing it — `dig`-quoted vs DoH-bare TXT values made every TXT row a false difference,
  a split DKIM string never matched the live one-string value, and `sort` ordered by the
  operator's locale. All normalised now, with `web/src/lib/dns-snapshot.test.ts` pinning it.
- **`--ns` cannot be run from a Claude session** — the container's port 53 is redirected to
  a local resolver that answers some names from cache and SERVFAILs others, so it returned
  a *random subset* of the zone. It now preflights the SOA and refuses without the `aa`
  flag. Run `--ns` from Jamie's machine, or use the new `--zonefile` mode on the
  registrar's zone export, which a session can do (no DNS egress needed).

## Acceptance criteria (rough)

- [ ] Domain managed from the new registrar; registrant = the company (or the titular change is filed as a separate DNS.pt act, and that is written down)
- [ ] `dns-snapshot.sh` before/after differ only in `@ A` and `www CNAME` (and any Resend records added)
- [ ] Mail to and from info@agorasim.pt works after the switch; admin.google.com → Billing still shows the subscription active
- [ ] Rollback values (old NS, old A/CNAME) recorded in the runbook §5

## Prompt

In the agorasim repo, read `.icm/intake/go-live/domain-transfer-tonight.md` and
`.icm/docs/launch-runbook.md` § Track T. You never touch DNS, registrar or Workspace —
Jamie does, with Diogo & Rita present. Your work: run `web/scripts/dns-snapshot.sh`
before the transfer, and during it compare against the pre-created zone when Jamie asks —
via `--zonefile` on the registrar's export, or by diffing the `--ns` output Jamie runs on
his own machine (a session container cannot reach an authoritative nameserver; see the
session note in the stub). Diff the outputs, name every record that differs, and say
whether the differences are the intended ones.
When Jamie confirms the domain has landed and mail is proven, fill §5 of the runbook
with the observed before/after values and `git mv` this stub to
`.icm/intake/go-live/_done/` in a PR on a `claude/` branch. CI is the source of truth.
