# Stub: Document SENTRY_DSN in web/.env.example

- lane: chore
- found-by: claude/error-tracking PR · 2026-09-10
- priority: P2
- size: XS
- sources: `web/src/lib/observability.ts` (reads `SENTRY_DSN` then
  `NEXT_PUBLIC_SENTRY_DSN`); `web/.env.example` (every other variable the app reads
  is documented there; these two are not)

## Problem

The error-tracking PR added `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` as the one switch
for Sentry, but the session that shipped it could not write to `web/.env.example` —
the harness blocks every `.env*` path, patches included — so the file still lists
every variable except these two. A fresh checkout following `.env.example` would not
know error tracking exists.

## Proposed change

Append this block to `web/.env.example`, after `BOOKING_TOKEN_SECRET=` and before the
`# TODO: note` tail:

```
# ---------------------------------------------------------------------------
# Error tracking — Sentry (see src/lib/observability.ts and src/instrumentation.ts)
# ---------------------------------------------------------------------------

# The project's DSN. **Unset means error tracking is off**: the SDK is never
# initialised and every capture is a no-op, so a local checkout or a preview
# without it behaves exactly as before — nothing throws, nothing is skipped.
#
# Server-side only. No Sentry code ships to the browser, so there is no client
# DSN to expose and the Content-Security-Policy is untouched. The
# `NEXT_PUBLIC_` name is honoured as a fallback only because it is the one the
# Vercel ↔ Sentry integration writes; prefer SENTRY_DSN, which stays private.
#
# What leaves the server: the error, the failing operation's tags, and — for an
# unhandled request error — the method, path and headers minus cookies and
# authorization. `sendDefaultPii` is off, so no IP addresses and no user data.
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

## Prompt

In the agorasim repo, append the Sentry block from
`.icm/intake/triage/env-example-sentry-dsn.md` to `web/.env.example` (after
`BOOKING_TOKEN_SECRET=`), then `git mv` the stub to `.icm/intake/triage/_done/`.
A one-file docs change — PR on a `claude/` branch; no local checks — CI is the
source of truth.
