# Stub: A rate limiter that survives serverless

- lane: chore
- found-by: re-cut from the purged `launch-cutover/rate-limit-store` (tech lens 2026-08-29; confirmed post-launch 2026-09-10 Q3) · 2026-09-18
- priority: P2

## Problem

`web/src/lib/rate-limit.ts:7-14` keeps counters in module memory — per instance, reset on
cold start; its own comment says it stops bursts, not slow attacks. Admin login and five
public actions rely on it. Fine for the sandbox; not for a live domain holding guest PII.

## Proposed change

Implement the already-exposed `RateLimitStore` over a shared store — a small Neon table with
opportunistic expiry (no new vendor), the in-memory store kept as the dev fallback; same
limits, same call sites; a modestly stricter login window.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/rate-limit-store.md` and back
`RateLimitStore` in `src/lib/rate-limit.ts` with a Neon table via drizzle (one migration),
keeping the in-memory fallback. Tests for cross-instance enforcement. `git mv` the stub to
`_done/` in the PR, on a `claude/` branch; CI is the source of truth.
