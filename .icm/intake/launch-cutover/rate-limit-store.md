# Stub: A rate limiter that survives serverless

- feature-slug: rate-limit-store
- epic: launch-cutover
- priority: P2
- size: S
- depends-on: none
- sequence: 7 of 8
- sources: tech lens: `web/src/lib/rate-limit.ts:7-14` — in-module memory store, per-instance, reset on cold start; its own comment admits it stops bursts, not slow attacks; admin login + public forms rely on it

## Problem

On Vercel serverless the throttle store evaporates per instance: a patient
brute-force on `/admin/login` is effectively unthrottled. Fine for the sandbox
period; not for a live domain holding guest PII.

## Proposed change

Implement the already-exposed `RateLimitStore` interface over a shared store — the
repo's cheapest real option is a small Neon table with a sweep, or Vercel KV if
Jamie prefers; pick in-stub, favouring no new service. Same limits, same call sites;
login gets a slightly stricter window.

## Acceptance criteria (rough)

- [ ] Limits enforced across instances and cold starts (verify on preview)
- [ ] No behaviour change for legitimate guests; CI green

## Prompt

In the agorasim repo (`web/`), back the rate limiter with a shared store per
`.icm/intake/launch-cutover/rate-limit-store.md`: implement `RateLimitStore`
(interface already in `web/src/lib/rate-limit.ts`) over a Neon table via drizzle
(default — no new vendor) with opportunistic expiry, keep the in-memory store as
dev fallback, and tighten the login window modestly. PR on a `claude/` branch; no
local checks — CI is the source of truth.
