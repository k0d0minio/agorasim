# Stub: Dead-code sweep — starter leftovers and superseded columns

- lane: chore
- found-by: /project code map + tech lens · 2026-08-29
- priority: P2
- size: S
- depends-on: `triage/admin-pricing-editor.md` for the `price_cents` drop only —
  everything else in the sweep is independent of it
- sources: `web/public/{file,globe,next,vercel,window}.svg` (Next.js starter,
  confirmed still present 2026-08-31); the `full_day` value surviving in the
  `availability_slot` enum; `@types/node ^20` against Node 22 CI

## Problem

Accumulated dead weight: Next.js starter SVGs
(`web/public/{file,globe,next,vercel,window}.svg`), the `full_day` value surviving
in the `availability_slot` enum (migrated away, never written), the superseded
`experiences.price_cents` still written and audited, and `@types/node ^20` against
Node 22 CI.

## Proposed change

One sweep PR: delete the SVGs; migration dropping `full_day` from the enum (verify
zero rows first) and `price_cents` (after the pricing editor retires its write —
check `.icm/intake/triage/admin-pricing-editor.md` status); bump `@types/node`.
Leave the four draft tables alone — blog/social epics use them; the Email studio
keeps its table by decision.

## Prompt

In the agorasim repo (`web/`), run the dead-code sweep per
`.icm/intake/triage/dead-code-sweep.md`. Check first whether the pricing editor
stub has merged (it retires the `price_cents` write path — if not merged, leave
that column and note it); everything else proceeds: starter SVGs deleted, enum
value dropped via migration after verifying no rows carry it, `@types/node`
aligned with CI's Node. PR on a `claude/` branch; no local checks — CI is the
source of truth.
