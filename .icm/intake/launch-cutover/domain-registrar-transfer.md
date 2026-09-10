# Stub: agorasim.pt moves from Amen to Jamie's registrar account — without Google Workspace noticing

- feature-slug: domain-registrar-transfer
- epic: launch-cutover
- priority: P1
- size: M
- depends-on: live-cutover-day
- sequence: 14 of 14
- blocked: human — Q14 answered 2026-09-10 (**Workspace billed directly by Google** — reseller risk gone); still open: receiving registrar (Q11), and Diogo & Rita's Amen login + registrant contact + auth code (Q12 — they have none of it ready). Post-launch, with a sit-down
- sources: live DNS 2026-09-10 (NS amenworld.com, MX Google, `mail.`/`webmail.` → Amen securemail.pro, SPF includes Amen's `spf.webapps.net`); `.icm/docs/launch-runbook.md` § Track I; the client's stated fear (mail outage)

## Problem

The registrar move is where Workspace can actually break: a reseller-billed Workspace
subscription can be cancelled when the domain leaves the reseller; a receiving
registrar can reset the zone; the DNS.pt confirmation goes to a registrant contact
nobody reads. None of this is needed for Saturday, and doing it in the same weekend as
the DNS cutover would put two failure modes on one day.

## Proposed change

Execute runbook Track I **after** launch is stable: pre-conditions (billing direct with
Google, super-admin known, Amen mailboxes exported/empty, zone exported, registrant
stays Agorasim Vintage with Jamie as managing contact, `.pt`-capable receiving
registrar, expiry checked), then auth code → pre-created identical zone → transfer →
verify record-for-record before any nameserver change → mail in/out proven. Session
work: a `dig`-style before/after record diff script the human runs at each step, and
the rollback table filled in.

## Acceptance criteria (rough)

- [ ] Domain managed from Jamie's registrar account; registrant unchanged (or changed only by explicit client decision)
- [ ] MX/SPF/DKIM/DMARC/facebook/Resend/Vercel records identical before and after; info@ mail proven
- [ ] Workspace subscription untouched (billing page checked after)

## Prompt

In the agorasim repo, read `.icm/intake/launch-cutover/domain-registrar-transfer.md` and
`.icm/docs/launch-runbook.md` § Track I. First check the runbook's Q10–Q16 have
answers in the deal folder; if Q14 (Workspace billing channel) is unanswered or says
"reseller", stop — this stub stays blocked. Otherwise write
`web/scripts/dns-snapshot.sh` (records via DNS-over-HTTPS, diffable) for the human to
run before/after each step, and walk Jamie through Track I without touching any
registrar or DNS yourself.
