# Stub: The Sales board shows every stage at the top, and Rita opens one with a tap

- lane: tweak
- found-by: feedback round 2, Rita's request on the Sales tab · 2026-11-12
- complexity: low
- priority: P1

## Problem

From `md` up, `/admin/sales` stacks the stages one under the other (`sales-stage-pager.tsx`,
since #237). On UAT at 1024 px, "Reservado" starts about 2,270 px down a 4,240 px page. Rita must
scroll past "Novo", "Contactado" and "Orçamentado" to reach it.

## Proposed change

The top of the Sales board shows one control per stage, with its count: Novo, Contactado,
Orçamentado, Reservado, Arquivado. A tap shows that stage, as the phone pager does today.

## Acceptance criteria

- [ ] At 1024 px and above, the five stages and their counts are visible without a scroll.
- [ ] A tap on a stage shows that stage's cards first, with no scroll past the other stages.
- [ ] The board opens on "Novo".
- [ ] The phone layout keeps its pager, and its stage controls match the wider layout.
- [ ] The controls work with a keyboard and say which stage is selected to a screen reader.

## Notes

- Decision open: show one stage at a time, or jump down a page that still holds all stages. The default above is one stage at a time. Keep the Spec approved gate.
- Files: `web/src/components/admin/sales-stage-pager.tsx`, `web/src/components/admin/sales-board.tsx`, `web/src/app/admin/sales/page.tsx`.
