# Stub: The enquiry records where it came from — GEO gets a number

- feature-slug: lead-source-attribution
- epic: admin-answers
- priority: P2
- size: M
- depends-on: admin-dashboard-what-needs-me
- sequence: 3 of 5
- blocked: scope — feature-shaped, outside the six contracted features; needs Jamie's
  call before any code
- sources: admin audit §6, harvested 2026-08-31; `web/src/db/schema.ts:377` (`source`
  exists) against `web/src/app/[locale]/reservar/actions.ts:138` (every row written
  `"website"`); the ICM workspaces' `targetQuery` values, `llms.txt` and the JSON-LD
  the site ships for exactly this audience

## Problem

`tour_requests.source` exists (`web/src/db/schema.ts:377`) and every enquiry writes
the same literal: `source: "website"`
(`web/src/app/[locale]/reservar/actions.ts:138`). The lead detail page renders it as
"via website" — a column with one value in it.

Meanwhile the whole content operation is aimed at attribution it cannot see: the ICM
workspaces generate blocks against named `targetQuery` values, every page ships
JSON-LD and `llms.txt` is maintained for AI crawlers, and there is no analytics
package in the repo at all — no referrer, no landing page, no campaign, no AI
referrer captured on a single enquiry. Nobody can answer which page, query or
assistant produced a booking, which is exactly the question the blog and social
epics are spending effort to influence.

## Proposed change

Capture what is free at submission time and store it on the enquiry: `document.referrer`,
the landing path, and any `utm_*` params carried through the session, as a
`source_context` jsonb column beside the existing `source` (widened from the constant
to a derived value: `website` · `google` · `ai` · `social` · `direct`). Then one
grouped read on the Sales board — enquiries by source for the period — so a month of
content work has a number next to it. No third-party analytics, no cookies, nothing
that touches the consent posture the form just established.

Feature-shaped and outside the six contracted features, so it needs Jamie's scope
call before it is built.

## Prompt

In the agorasim repo (`web/`), add lead-source attribution per
`.icm/intake/admin-answers/lead-source-attribution.md` — confirm with Jamie that it is in
scope before building. Migration adding `source_context` (jsonb) to `tour_requests`;
`/reservar` carries referrer, landing path and any `utm_*` params through to
`submitTourRequest` (`web/src/app/[locale]/reservar/actions.ts`), which derives
`source` from them instead of writing the constant `"website"`; the lead detail page
shows the real origin, and the board (or dashboard) shows enquiries grouped by source
for the period. No third-party analytics and no cookies — this must not disturb the
marketing-consent record. Portuguese strings — the admin is PT (D4 in
`.icm/project.md`). PR on a `claude/` branch; no local checks — CI is the source of
truth.
