# Breakdown: Go-live — agorasim.pt takes real bookings, on their domain, with the fee on

- epic-slug: go-live
- sources: Jamie's answers 2026-09-11 (this session): full registrar transfer tonight to the Portuguese registrar at pt.pt with Diogo & Rita present, registrant = their company, zone on the new registrar's DNS, site goes live when the domain lands; Stripe platform account live-activated, Connect fee on from booking one; PAX = adults only (client answered); wedding/event public enquiry forms + manual booking from the Sales board are the only feature adds. Live DNS as observed 2026-09-11 (`.icm/docs/launch-runbook.md` §1). Previous intake tree purged the same day (`git log -- .icm/intake`).

## What I understood

The booking engine, commission (4% Stripe Connect application fee, refunds pro-rata),
guest cancellation, enquiry acknowledgements, terms/privacy/footer compliance, Sentry
and the nightly backup are all on `main`. What separates the sandbox from a live
business is now **operations, not code**: the domain moves registrar tonight and the
site follows it; two Stripe accounts get wired together; email leaves from the client's
domain. Two small product gaps were pulled forward because they feed the same funnel:
the wedding/event enquiry doors (still a disabled preview) and a manual booking Rita can
raise from the Sales board when a guest calls.

The dangerous step is the registrar transfer, because Google Workspace (Mail, Calendar,
Drive — everything they run on) hangs off the same zone. Workspace is billed directly
by Google, so the transfer itself cannot cancel it; only a lost record can. The whole
plan is therefore: **mirror the zone record-for-record at the new registrar before any
nameserver changes, then verify, then switch.** The runbook (`.icm/docs/launch-runbook.md`)
is the human choreography; the stubs here are its repo-side halves plus the two features.

PAX-vs-adults is closed: the client answered *adults only* on 2026-09-11, which is what
`web/src/lib/pricing.ts` already does. No stub.

## Build order

1. domain-transfer-tonight — Amen → the Portuguese registrar, zone mirrored, Workspace untouched — depends-on: none
2. stripe-connect-live — Connect platform profile, Diogo & Rita's account, live webhook, env — depends-on: none
3. resend-sending-domain — confirmations from `reservas@agorasim.pt`, reply-to `info@` — depends-on: none
4. wedding-event-enquiry-forms — casamentos + eventos forms write `enquiry_kind` into the Sales board — depends-on: none
5. sales-board-manual-booking — the calendar's manual booking dialog, reachable from the Sales board — depends-on: none
6. go-live-on-landing — nameservers switch, Production env, €1 test, verification — depends-on: domain-transfer-tonight, stripe-connect-live, resend-sending-domain

Session work today: 3 (app half), 4, 5, plus the `dns-snapshot.sh` script (shipped with
this breakdown). 1, 2 and 6 are human checklists Jamie drives tonight and when the
domain lands; sessions verify and report, never touch DNS, registrar or keys.

## Out of scope (whole epic)

- Admin quote builder, deposit payment links, balance scheduler (weddings stay
  quote-by-hand from the enquiry).
- Blog, social, media, day-before reminder, thank-you email, rate-limit store,
  dashboard/money views, every triage item from the purged tree — re-cut after launch
  if still wanted.
- Removing Amen's legacy mail records (`spf.webapps.net`, `mail.`, `webmail.`, `ftp.`)
  — carried over verbatim; cleaned up in a later pass once mail is proven.
