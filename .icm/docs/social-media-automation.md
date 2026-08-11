# Spike: Programmatic Multi-Platform Social Media Publishing

| Field | Value |
|---|---|
| **Status** | Draft — for review |
| **Author** | _[your name]_ |
| **Date** | 2026-07-01 |
| **Ticket** | _[LINEAR-XXX]_ |
| **Timebox** | _[e.g. 1 day]_ |
| **Decision required from** | _[tech lead / client stakeholder]_ |

## Context

The project needs to publish content (text posts, images, video) to multiple social networks — Instagram, Facebook, TikTok, YouTube, and LinkedIn — from an automated, code-driven workflow rather than manual uploads. This spike investigates whether that can be done *reliably*, what each platform requires, and the trade-offs of the available integration approaches, so we can decide whether and how to build it into this repository.

"Reliably" is the operative word: the goal is an integration that keeps working in production, not one that breaks on a platform UI change or risks account suspension.

## Objective

Answer three questions:

1. Can we automate posting to these platforms in a stable, ToS-compliant way?
2. What does each platform actually require (account type, auth, approvals, limits)?
3. What are the integration options, and what are their advantages and disadvantages?

## Summary / Recommendation (TL;DR)

- Reliable automation is achievable, but **only via each platform's official API.** Browser automation and reverse-engineered libraries are out of scope — they violate platform terms and are not production-safe.
- Nearly every platform requires the target account to be a **Business/Creator account** (not a personal profile), **per-account OAuth**, and — for TikTok and LinkedIn in particular — a **manual app review/audit** before going live.
- Three viable architectures: **(A)** direct per-platform integration, **(B)** a hosted unified publishing API, **(C)** a self-hosted open-source unified layer.
- **Default recommendation is conditional.** For a fixed set of the client's own accounts and/or where data ownership matters, a self-hosted unified layer (Postiz) gives one scriptable integration under our control. For fastest delivery without infrastructure, a hosted unified API removes the approval gates at a recurring cost. Direct per-platform integration is only worth it for a one- or two-platform scope needing full payload control.
- **Blocking decision:** the correct option depends on the account model — see [Decision Drivers](#decision-drivers-must-confirm-before-estimating). Confirm with the client before estimating.

## Key Constraint: Official APIs Only

Two categories of approach exist; only one is viable for production.

- **Official platform APIs** — sanctioned, OAuth-based, rate-limited, stable. This is the chosen approach.
- **Unofficial methods** — browser automation (Selenium/Playwright driving the web UI) and reverse-engineered client libraries. These break whenever the platform changes its front end, and they violate each platform's terms of service; even when technically functional, they expose the client's accounts to throttling or permanent suspension. **Excluded from this spike.**

Using an official API removes the *ToS-violation* risk but not *behavioural* detection: platforms still monitor posting frequency, IP consistency, and content similarity, and can restrict accounts that behave like bots even through sanctioned APIs. Sensible posting cadence and per-account isolation remain necessary regardless of approach.

## Per-Platform Findings

| Platform | Official posting API | Account type | Key constraints | Approval gate |
|---|---|---|---|---|
| **YouTube** | Data API v3 | Any channel | Upload ≈ 1,600 quota units; default 10,000 units/day ≈ ~6 uploads/day (extendable on request) | OAuth app verification if connecting external users |
| **Facebook** | Graph API (Pages) | Page — personal-profile posting was removed years ago | `pages_manage_posts` + Page access token | App Review + business verification for production |
| **Instagram** | Graph API — Content Publishing | Business/Creator linked to a Facebook Page | Photos, video, reels, carousels; ≈ 25 posts / 24h; no personal-account API | App Review + business verification |
| **LinkedIn** | Member / organization posts API | Personal profile (`w_member_social`) and company pages | Straightforward once approved | Product / API access approval |
| **TikTok** | Content Posting API | Creator / Business | Video-first; access token expires every 24h (refresh token 365d); per-creator daily cap (varies, ~15/day, shared across API clients); **no native scheduling**; posts forced to private (SELF_ONLY) until the app passes audit | Mandatory app audit (weeks) |

Cross-cutting themes:

- **Business/Creator accounts are required.** Personal Instagram and personal Facebook profiles cannot be posted to via API.
- **OAuth is per account.** Each account the client wants to post to must individually authorise the integration; its tokens must be stored securely and refreshed.
- **Approval is the real cost, not the code.** TikTok's audit and LinkedIn's product access are the slowest, least predictable parts of a direct build. TikTok additionally forces every post to private visibility until the audit passes, and offers no native scheduling — a publish queue must be built in-house.

## Architecture Options

### Option A — Direct per-platform integration

Write and maintain a separate client per platform (OAuth flow, token storage/refresh, upload/publish, error handling) inside this repo.

**Advantages**
- Full control over payloads, retry logic, and error handling.
- No third-party dependency and no per-post cost.
- Data and credentials never leave our infrastructure.

**Disadvantages**
- We own five separate OAuth flows and app registrations, plus the TikTok audit and LinkedIn access approvals.
- Highest ongoing maintenance: each platform's API changes independently and breaks independently.
- TikTok's scheduling queue, token refresh, and multi-step chunked uploads must all be built and maintained by us.
- Longest time-to-first-post because of the approval gates.

_Best when the client needs only one or two platforms and wants complete control over the payloads._

### Option B — Hosted unified publishing API

Integrate a single commercial API (e.g. Ayrshare, Zernio) that exposes one endpoint for all platforms and holds the platform-side approvals on our behalf.

**Advantages**
- One integration instead of five; fastest time-to-production.
- The vendor's pre-approved app **bypasses the TikTok audit and LinkedIn approval** for our use case — accounts connect immediately.
- Token refresh, chunked uploads, rate-limit handling, and platform API drift become the vendor's problem.

**Disadvantages**
- Recurring cost that scales with connected accounts/volume (entry tiers from low tens of $/mo; enterprise options into hundreds of $/mo).
- A third-party dependency in the critical path; the client's content and tokens transit a vendor.
- Less control over payload edge cases and platform-specific features.
- Vendor lock-in.

_Best when speed matters more than infrastructure ownership and the recurring cost is acceptable._

### Option C — Self-hosted open-source unified layer

Deploy an open-source publisher on our own infrastructure and drive it from the repo via its API.

- **Primary candidate: Postiz** (AGPL-3.0) — 20+ networks, a real public REST API, and a shipped MCP server; integrates with scripts and automation tools (n8n / Make / custom code).
- **Secondary: Mixpost** — mature, but dashboard-oriented with **no public API**, so it is not usable as a scriptable backend and is a poor fit here.

**Advantages**
- One integration surface (Postiz's API) instead of five, while keeping content, credentials, and infrastructure fully in-house — relevant for data ownership / compliance.
- No recurring per-post SaaS fee (self-hosted); cost is our own server.
- Open source: inspectable, extensible, no vendor lock-in. The MCP server aligns with agent/automation workflows.

**Disadvantages**
- We still register our own platform apps and pass the **TikTok audit / LinkedIn approval** ourselves — unlike Option B, the OSS layer does not carry pre-approval.
- Operational overhead: the stack has moving parts (queue/worker, Redis, Postgres) to deploy, monitor, and keep updated.
- Support is community-based; no SLA.

_Best when the client values data ownership and a single scriptable integration, and we can absorb the approvals and the ops._

## Decision Drivers (must confirm before estimating)

The correct option hinges on questions only the client can answer:

1. **Account model.** Are we posting to a *small, fixed set of the client's own Business/Creator accounts*, or connecting *arbitrary end-user accounts* (e.g. a product feature)? The latter forces us through every platform's app review regardless of option and materially changes the estimate.
2. **Platforms actually required.** All five, or a subset? Dropping TikTok removes the audit; reducing to YouTube + Facebook/Instagram removes the hardest gates entirely.
3. **Scheduling.** Post-on-trigger only, or scheduled/queued publishing? TikTok has no native scheduling — it must be built in-house or provided by a unified layer.
4. **Data ownership / compliance.** Does client policy prohibit content or tokens transiting a third-party vendor? If yes, Option B is out.
5. **Volume.** Expected posts per account per day — must sit within each platform's cap (~25/day Instagram; per-creator caps on TikTok).

## Risks

- **Approval timelines are unpredictable.** TikTok audit and LinkedIn access can take weeks and can be rejected — schedule risk outside our control. Mitigate by starting approvals early and de-scoping to non-gated platforms (YouTube, Facebook/Instagram) for a first release.
- **Token lifecycle.** Short-lived tokens (TikTok, 24h) require reliable refresh and secure storage; failure means silent posting outages. Mitigate with monitoring/alerting on auth failures.
- **Account suspension.** Even via official APIs, bot-like patterns can trigger restrictions. Mitigate with sane cadence, per-account isolation, and no injected watermarks/branding (an explicit TikTok guideline violation).
- **Platform API drift.** Endpoints and limits change. Options B and C shift this maintenance burden off us; Option A does not.

## Recommendation

Pending the Decision Drivers, the default is **Option C (self-hosted Postiz)** where data ownership matters and the accounts are a known set — one scriptable integration under our control. Where time-to-market outweighs infrastructure ownership and recurring cost is acceptable, **Option B (hosted unified API)** is preferable because it removes the approval gates entirely. **Option A** is justified only for a one- or two-platform scope needing full payload control.

## Next Steps

1. Confirm the Decision Drivers with the client (especially account model and required platforms).
2. Build a proof-of-concept against the lowest-friction platform (YouTube or Facebook/Instagram) to validate the auth + publish flow end-to-end.
3. If TikTok/LinkedIn are in scope, initiate their app registrations/audits immediately in parallel — treat as long-lead items.
4. Re-estimate build effort once scope and option are fixed.

## References

- TikTok — Content Posting API, direct post reference: <https://developers.tiktok.com/doc/content-posting-api-reference-direct-post>
- TikTok — Content sharing guidelines (rate caps, visibility, disclosure): <https://developers.tiktok.com/doc/content-sharing-guidelines>
- Postiz (open source): <https://github.com/gitroomhq/postiz-app>
- Mixpost (open source): <https://github.com/inovector/mixpost>
- Meta — Graph API docs (Instagram Content Publishing & Pages): <https://developers.facebook.com/docs>
- YouTube Data API v3: <https://developers.google.com/youtube/v3>
- LinkedIn — Marketing / Community Management API: <https://learn.microsoft.com/en-us/linkedin/>