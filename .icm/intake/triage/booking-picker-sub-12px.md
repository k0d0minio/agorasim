# Stub: The booking date picker prints a 10px caption

- lane: tweak
- found-by: `admin-portugues/hig-polish-pass` HIG audit · 2026-08-31
- priority: P2
- size: XS
- sources: `web/src/components/booking-date-picker.tsx:413` (`text-[0.625rem]`);
  `.icm/project.md` constraints ("nothing below 12px");
  `web/docs/admin-mobile-design-spec.md` §3 F2

## Problem

The scarcity caption under a departure slot — the "last car" line — renders at
`text-[0.625rem]`, which is **10px**. That is the only sub-12px text left in
`web/src`, and it sits on the public booking flow, on a phone, under the line a
guest reads to decide whether to book now.

The 12px floor is a project constraint, not an admin-only rule: the admin spec
writes it down (§3 F2) because that is where it was first argued, but
`.icm/project.md` states it for the estate. The public site's users are the same
people on the same phones — the design spec's §12 says so in as many words when
it explains why the touch-comfortable primitive sizes are shared.

Out of scope for the HIG polish pass that found it: that stub owns `/admin`, and
public-site fixes live with the epic that owns the surface.

## Proposed change

Raise the caption to `text-xs` (12px) and check the slot button still reads
cleanly at 320px with the longer Portuguese string — the button is
`min-h-11 flex-col`, so it has room to grow downwards, but the pair of slot
buttons sits in a two-column grid and the measurement is worth making rather
than assuming.

## Prompt

In the agorasim repo (`web/`), raise the sub-12px caption in
`web/src/components/booking-date-picker.tsx:413` to the 12px floor per
`.icm/intake/triage/booking-picker-sub-12px.md`, and verify the departure-slot
buttons still lay out at 320px and 375px with both the PT and EN strings. PR on a
`claude/` branch; no local checks — CI is the source of truth.
