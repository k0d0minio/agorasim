# Findings jam-471

## F1. Draft comment for JAM-471 (not posted: a session in this repo does not write to Linear)

> Spike result: `.icm/docs/go-live-plan.md` on PR k0d0minio/agorasim#274 (Q1 answered: blog, social and SMS follow after go-live).
>
> Answer: the shortest safe path has two milestones. **M1, the new site on agorasim.pt with the
> enquiry form: Thu 2026-12-03.** **M2, paid bookings: Wed 2026-12-09.** The DNS is already at
> Vercel (NS `ns1/ns2.vercel-dns.com`, the full Amen zone mirrored), so the switch is two
> records in Vercel DNS and needs no registrar or Amen act. The registrar transfer moves to
> after go-live. The old go-live app stubs shipped (#88, #101, #102).
>
> Critical path: the client's yes on UAT (2026-11-30), release 1.1.0 with 15 production
> migrations (0027–0041) on 2026-12-01, then the switch. M2 waits on the RNAAT number,
> insurance, the fatura rule (JAM-473) and Diogo's verified Stripe account (JAM-472).
>
> Found: Production env has no `RESEND_API_KEY`, `SENTRY_DSN`, `GOOGLE_PLACES_API_KEY` or
> `BACKUP_BLOB_READ_WRITE_TOKEN`. The Stripe, site URL and email values are shared with
> Preview. UAT has no `RESEND_API_KEY` either. No Resend records for agorasim.pt.
> `prod.agorasim.pt` is not attached. A build keeps its env, and the promotion never builds:
> set Production env before the staged build that is promoted.
>
> Q1: Jamie decided on 2026-11-23 that blog, social and SMS follow after go-live. Ten client questions are in §6
> of the page. The runbook is brought up to date: no reference to `.icm/intake/go-live/`.

## F2. Proposed build tickets (draft, not created)

1. **The production env is complete and its own** (chore, 0.5 d, Jamie in Vercel). Split the
   shared Stripe, `NEXT_PUBLIC_SITE_URL`, `BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS`,
   `ADMIN_PASSWORD` from Preview. Add `RESEND_API_KEY` (Production and UAT), `SENTRY_DSN`,
   `GOOGLE_PLACES_API_KEY`, `BACKUP_BLOB_READ_WRITE_TOKEN`. Plan B7, B9.
2. **Resend sends from agorasim.pt** (chore, 0.5 d). Domain in Resend, records in Vercel DNS,
   Verified, a test email read in info@. Plan B7, B8.
3. **The legal texts are filled and the draft banner goes** (tweak, 0.5–1 d). The
   `TODO(legal)` lines of the terms and the privacy page from the client's answers. Blocked on
   B16–B20. Plan B24.
4. **`dns-snapshot.sh` reads the zone as it is at Vercel** (chore, 0.25 d). Add the names
   `smtp`, `_autodiscover._tcp`, `prod`, `uat` and the CAA type. Drop the `--ns` pre-transfer
   usage from its header.
5. **`main` has a ruleset that requires `ci`** (chore, 0.25 d, Jamie in GitHub). Plan A4.
6. **The go-live switch** (handover, Jamie): runbook Tracks P, G, H on 2026-12-03.
7. JAM-288 and JAM-289 stay the tickets of the migration and of the first promotion. They are
   steps B5, B6, B13 of the plan.

## F3. Blueprint gap (report to Jamie, do not edit `.icm/_system/`)

`features/uat.md` says the promotion never builds again. A Vercel build keeps the env values of
its build time. The contract has no step for a change of Production env: after such a change,
a new staged build must exist before `promote.sh approve`. It is not verified which build
`promote.sh` picks when a commit has two production builds (a redeploy).

## F4. Other findings

- The repo `k0d0minio/agorasim` is **public** (`gh api`). It holds client names, the business
  plan in `.icm/` and the runbook. Confirm that this is intended.
- `workspaces/_config/business-facts.md` says the site goes live on the registrar transfer of
  2026-09-11 (found by the JAM-475 session). Out of date.
- The production database has 5 bookings of 2026-09-05 or before (3 confirmed). Probably tests.
  Plan B10.
- The Neon project `uat-agorasim` may be at its branch limit (JAM-475 session): a new preview
  can fail at 0 ms. This pull request's preview can fail the same way.
