# Handoff jam-528

## Next action

Jamie answers Q1 on the HUD (or takes the default), ticks Spec approved on PR #293, then says
`build JAM-528`. Build after JAM-527 is built: this branch is cut from the JAM-527 branch.
Merge the JAM-527 branch in before the build, so that the NIF column and its migration come
first. The migration of this run takes the next free number.

## How to test

On the preview, pay a tour booking. Open `/admin/sales/faturar`: the payment is in today's
list. Mark it "Fatura emitida" with a number, reload, and see the number.

## Blockers

- Q1 waits for an answer. Spec approved is not ticked.
- JAM-527 must be built first.

## Do not touch

- none
