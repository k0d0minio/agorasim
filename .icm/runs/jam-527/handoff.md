# Handoff jam-527

## Next action

Jamie answers Q1 on the HUD (or takes the default), ticks Spec approved on PR #292, then says
`build JAM-527`. JAM-528 builds on this branch: its migration takes the number after this one.

## How to test

On the preview, open `/reservar`, book a tour with the NIF 123456780 and a second time with
123456789. The first is accepted, the second is refused. Then open the sale in `/admin/sales`
and see the NIF.

## Blockers

- Q1 waits for an answer. Spec approved is not ticked.

## Do not touch

- `web/src/lib/booking-checkout.ts` and `/reservar`: the JAM-503 run changes them at the same
  time. Merge `main` in after JAM-503 merges.
