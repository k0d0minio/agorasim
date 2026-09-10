# Stub: An alarm on the silent failure paths

- feature-slug: error-tracking
- epic: launch-cutover
- priority: P1
- size: M
- depends-on: none
- sequence: 6 of 8
- sources: tech lens: zero observability; three designed-silent paths — email "never throws" (`web/src/lib/email.ts:11-16`), orphan paid session logs "needs a human" and 200s (`api/stripe/webhook/route.ts:103-105`), Neon blip bakes the unsellable fallback catalogue into ISR for an hour (`experience-catalogue.ts:70-79`)

## Problem

A paid booking whose confirmation email quietly failed, an orphaned payment, or an
hour of the site silently refusing to sell — nobody would know. Vercel's log
retention is short and nobody reads logs.

## Proposed change

Sentry (default — free tier fits; server + client, tunnel-friendly with the CSP) or,
if Jamie prefers zero third parties, a log-drain + email alert on the named paths.
Either way: the three silent paths emit explicit captures; the privacy policy's
"no third-party" stance gets checked (server-side-only Sentry needs at most a
recipients line — no cookies, keep the no-banner claim true). Alert lands in Jamie's
inbox.

## Acceptance criteria (rough)

- [ ] Each named silent path produces an alert when forced in preview
- [ ] No new cookies/client trackers; privacy claims still true (or amended)
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add error tracking per
`.icm/intake/launch-cutover/error-tracking.md`: default to @sentry/nextjs
(server-side capture; keep client bundle lean; respect the CSP in
`web/src/lib/security-headers.ts`), explicit captures on the three named silent
paths, DSN via env only. Check `web/src/content/privacy.ts` claims still hold and
amend the recipients if needed (coordinate with the privacy-refresh stub if both in
flight). PR on a `claude/` branch; no local checks — CI is the source of truth.
