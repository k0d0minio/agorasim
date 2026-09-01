# Stub: Dialog footers tab in the reverse of the order they are read

- lane: decision
- found-by: `admin-portugues/hig-polish-pass` HIG audit · 2026-08-31
- priority: P3
- size: S
- sources: `web/src/components/ui/dialog.tsx` (`DialogFooter`, `flex-col-reverse`);
  `web/docs/admin-mobile-design-spec.md` §2 T5, §7 S2;
  WCAG 2.2 §2.4.3 Focus Order, §1.3.2 Meaningful Sequence

## Problem

On phones `DialogFooter` is `flex-col-reverse`, which is what puts the safe
action (Cancelar) nearest the thumb while the destructive one sits above it —
T5 and S2, and the mechanism is documented in the component. The cost is that
visual order and DOM order are inverses: a keyboard or switch user tabbing
through the confirm dialog reaches Cancelar first and "Eliminar
definitivamente" last, while a sighted user reads them the other way up. The
availability calendar's day editor has three buttons and so inverts a
three-item sequence.

Neither order is obviously right, which is why this is a decision rather than a
fix:

- **DOM order Cancel-first** (today) puts the safe action under the first Tab,
  which is a good default for a destructive confirm — at the price of 2.4.3.
- **DOM order matching the visual order** satisfies 2.4.3 and 1.3.2, and lands
  the first Tab on the destructive button.
- A third option keeps the visual order and reorders only focus with
  `tabindex`, which trades one WCAG problem for a different one.

No admin dialog is unusable today: every button is reachable, labelled and
≥44px, and the typed-APAGAR confirms are armed only after the word is typed, so
a mis-tab cannot erase anything. This is a correctness question about the shared
primitive, not a live defect, and it belongs to whoever next revisits the sheet
and dialog layer — not to a translation epic's polish pass.

## Proposed change

Decide the rule, write it into `web/docs/admin-mobile-design-spec.md` §7
alongside S2 (which currently states the visual order and is silent on focus),
and make `DialogFooter` implement it once for every caller. Whatever is chosen,
the typed-confirmation dialogs keep their armed-button behaviour.

## Prompt

In the agorasim repo (`web/`), settle the dialog-footer focus-order question per
`.icm/intake/triage/dialog-footer-focus-order.md`: pick an order, record it in
`web/docs/admin-mobile-design-spec.md` §7 next to S2, and implement it in
`DialogFooter` in `web/src/components/ui/dialog.tsx` so every dialog follows —
`delete-submission-dialog`, `experience-row-actions`, `user-row-actions`,
`sign-out-everywhere-button` and the calendar's day editor and bulk sweeps. PR on
a `claude/` branch; no local checks — CI is the source of truth.
