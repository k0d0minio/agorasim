# AGORA-005 · Content & weddings: real photos, car stories, /casamentos live

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P1 |
| Size | M |
| Blocked by | — (Section 2 answers arrived 18 Aug: `.icm/docs/agorasim-info.pdf`, local only) |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 4 |

> **Done 2026-08-18, content-only**: weddings offer + `/casamentos` live with the
> quote form and Wedding Awards badges, car names/years/stories in `site.ts`,
> testimonials on the home page, PT/EN throughout. The **photos** acceptance is
> carved out to [AGORA-008](../AGORA-008-photo-ingestion.md) — the WeTransfer
> links in the answers had expired before ingestion; everything is structured so
> the images drop in without further copy changes.

## Problem

Media is thin: 8 real photos, partners reusing generic car shots, two "photographs on their
way" tiles on the weddings page, and no real weddings offer or testimonials. Launch scope
includes weddings (`/casamentos`) going live.

## Acceptance

- [ ] Real photos ingested and optimized (partners, Renault 4L + VW T3, tour-in-action).
- [ ] Car details and stories in `site.ts` / experience content.
- [ ] Real weddings offer + pricing in `weddings.ts`; enquiry form enabled; `/casamentos`
      flipped to live in `routes.ts`.
- [ ] Testimonials section from their 3–5 quotes.
- [ ] PT/EN parity on all new content (`Localized<T>` everywhere).
- [ ] CI green.

## Prompt

Land the real content for the agorasim launch and take /casamentos live. Read
.icm/intake/AGORA-005-content-and-weddings.md and .icm/docs/launch-plan.md (Phase 4) for
full context — do not start until the Section 2 answers and photos exist; never invent
offer facts. Open a PR on a claude/ branch; do not run local checks — CI is the source of
truth.
