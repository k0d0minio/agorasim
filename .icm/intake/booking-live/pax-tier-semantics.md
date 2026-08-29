# Stub: Resolve PAX-vs-adults in every tier and minimum

- feature-slug: pax-tier-semantics
- epic: booking-live
- priority: P1
- size: M
- depends-on: sandbox-e2e-handover
- sequence: 8 of 8
- blocked: awaiting client answer — "does PAX count children?" (open-questions pack item, icm-board deal folder)
- sources: 2026-08-29 product lens: `web/src/lib/pricing.ts:173-214` keys `tierFor` and every `minAdults` on adults only; prices.pdf says "8 PAX 500€", "PUBLIC (MIN. 2 PAX)"

## Problem

The engine counts **adults** where the price sheet counts **PAX**: 2 adults + 6
children price as the 1–3 tier (€220 + 6×€30 = €400) where the 8-pax row says €500 —
three cars staffed at a one-car price. 3 adults + 2 children public pays 62€/adult
instead of the 4–12-pax 58€. Óbidos public blocks 1 adult + 1 child (2 pax) via
`minAdults: 2`. 12 adults + 2 children sells past the 12-pax table. Real-money
correctness — must be right before live keys, not before the sandbox test.

## Proposed change

When the client answers: re-key `tierFor` and minimums on the answered basis
(likely adults+children = PAX, infants excluded), align `MAX_SEATS` handling with the
12-pax table + capacity rules, update seeds/fallback content if the semantics change
their meaning, and extend `pricing.test.ts` with the exact scenarios above. Also
settle the Manzwine "min 2" adults-vs-guests transcription question in the same pass.

## Acceptance criteria (rough)

- [ ] 2 adults + 6 children private countryside prices per the answered rule
- [ ] Óbidos public accepts/rejects 1 adult + 1 child per the answered rule
- [ ] Tests encode every scenario in this stub
- [ ] CI green

## Prompt

In the agorasim repo (`web/`): the pricing engine keys group tiers and add-on
minimums on adult count while `.icm/docs/prices.pdf` keys them on PAX — read
`.icm/intake/booking-live/pax-tier-semantics.md` for the four concrete mispricing
scenarios and check the client's answer in the icm-board deal folder
(`workspaces/deals/diogo-rita/open-questions.md` responses) before coding. Re-key
`web/src/lib/pricing.ts` accordingly, cover each scenario in `pricing.test.ts`, and
update seeded pricing JSON only if semantics (not numbers) changed. PR on a `claude/`
branch; no local checks — CI is the source of truth. If the client has not answered,
stop — this stub stays blocked.
