# Admin mobile design spec

The `/admin` section is used as an **installed PWA on a phone, in the field** — one-handed,
standing next to a car, in bright sun, on rural 4G, often with a guest waiting. This document is
the set of concrete rules the admin UI is built to. Every rule is numbered so code review can say
"violates F3" instead of re-arguing the design. Sources are cited inline; the full list is at the
end. Numbers were verified against the live sources in August 2026 — several differ from folklore
(e.g. the HIG no longer states a blanket "44pt minimum", and WCAG AA's floor is 24px, not 44).

**The test for every screen:** can the job be done in under ten seconds, with one thumb, without
zooming, without a mistap.

## 1 · Design frame

- **D1.** The canonical design frame is **390 × 844 CSS px portrait** (iPhone 12–16 class). Layouts
  are designed *in* this frame and then allowed to grow. Desktop may end up a centred column;
  that is acceptable by mandate.
- **D2.** The reflow floor is **320 CSS px wide**: no two-dimensional scrolling and no loss of
  function at 320px, per WCAG 1.4.10. Excepted regions (data tables, JSON dumps) scroll inside
  their **own** `overflow-x-auto` container — the page itself never scrolls sideways.
- **D3.** Verified widths: 320 × 568, 375 × 667, 390 × 844, 430 × 932, plus one tablet and one
  desktop width. All iPhones are “compact width” in portrait (HIG Layout), so there is exactly one
  phone layout — no phone-size branching.
- **D4.** Breakpoints follow the Tailwind scale already in use, mapped onto M3 window-size classes:
  below `md` (768px) is the phone layout (M3 *compact* is < 600dp; 640–768 gets the phone layout
  too rather than a third design); `md`+ may add the sidebar; **data tables return only at the
  width where they actually fit** (see L-rules), not at a fixed alias.

## 2 · Touch targets (T)

- **T1.** Every interactive element is at least **44 × 44 CSS px**. This is Apple's *default*
  control size (HIG Accessibility: default 44×44pt, absolute minimum 28×28pt) and WCAG 2.5.5
  (AAA). The AA floor (2.5.8) is only 24×24px — we build to 44 because gloves, sunlight and a
  moving thumb do not read the exceptions list.
- **T2.** Controls pinned to the screen's bottom edge (the toolbar) get **≥ 48px** height.
  Hoober's touch-accuracy data: precision degrades from ~7mm at screen centre to ~12mm (~46px) at
  the bottom edge — edge controls must be the *largest* on screen, not the smallest.
- **T3.** **≥ 8px separation** between adjacent targets (M3 structure guidance). Where two
  same-size controls must abut (icon-button clusters), the visible icon stays ≤ 24px inside a
  44px+ hit area so effective spacing exceeds 8px.
- **T4.** The visual glyph may be smaller than the target (24px icon inside a 44px button) —
  the *target* is what is measured.
- **T5.** Destructive actions never sit inside the thumb's resting path (bottom-centre/right of
  the screen or directly adjacent to a frequent action). They are separated spatially *and*
  visually from safe actions (Hoober: plan for interference; HIG Modality). In stacked
  sheet/dialog footers the safe action (Cancel) is **nearest the thumb** (bottom), destructive
  above it.
- **T6.** Nothing in the admin requires a drag. Reordering is arrow buttons, stage moves are a
  status picker (WCAG 2.5.7). Horizontal swipe rails always have a tap equivalent (chips).

## 3 · Type & text (F)

- **F1.** Every text input, select and textarea has a **computed font-size ≥ 16px**. iOS Safari
  zooms the page when focusing a field whose computed size is ≤ 15px, and the zoom threshold is
  unchanged in 2025/26. This is fixed in the primitives, never per page. The viewport meta is
  *not* allowed to cap zoom to work around it (breaks WCAG 1.4.4).
- **F2.** Type scale: page title 16px semibold (heading font); card/section titles 16px;
  body/primary content 14px; secondary metadata 12px. **Nothing below 12px.** Button labels 14px
  (M3 Label Large); input text 16px (F1).
- **F3.** Text must survive **200% zoom** (WCAG 1.4.4): no fixed-height text containers, truncation
  only on single-line identifiers with the full value available elsewhere.
- **F4.** Line length of body text stays in the 40–60ch band on wide screens (M3 layout guidance)
  — long-form panels get a `max-w`, they do not stretch.

## 4 · Colour & contrast (C)

- **C1.** Text contrast ≥ **4.5:1**; large text (≥ 24px, or ≥ ~18.7px bold) ≥ 3:1 (WCAG 1.4.3;
  thresholds are strict — 4.49:1 fails). The warm Saloia palette in `globals.css` is the source of
  truth; the audit script verifies measured pairs.
- **C2.** Non-text UI indicators ≥ **3:1** against adjacent colours (WCAG 1.4.11). Consequence
  found in the audit: the old field border (`--border`, oklch L 0.90 on L 0.985 background) was the
  *only* boundary of an input and measured far below 3:1. Fields now use a dedicated darker
  `--input` border token that clears 3:1 — which is also simply what a screen in the sun needs.
- **C3.** Focus must be visible and unobscured: a global `scroll-padding-top/-bottom` equal to the
  sticky header / bottom toolbar heights keeps a focused element from being scrolled underneath
  either (WCAG 2.4.11).
- **C4.** **Dark mode stays absent** in this pass. `globals.css` documents why the old dark tokens
  were removed; a real dark Saloia palette is a design job of its own and requires
  `viewport.themeColor` to become media-aware at the same time. Half of that job is worse than
  none of it — deferred, deliberately (see §11).

## 5 · Safe areas & viewport (V)

- **V1.** `viewport-fit=cover` stays on; the shell pads with `env(safe-area-inset-top)` (header)
  and `env(safe-area-inset-bottom)` (bottom toolbar, bottom sheets, sticky action bars). `env()`
  is the only source of truth for inset geometry — the HIG no longer publishes device numbers.
- **V2.** Full-height layouts use **`min-h-dvh`**, not `min-h-screen`/`100vh`: classic `vh`
  behaves like the *largest* viewport on mobile and overflows behind browser chrome. Note `dvh`
  deliberately ignores the on-screen keyboard — it solves toolbar chrome, not keyboard occlusion
  (see V4).
- **V3.** Standalone display removes every browser affordance except the status bar; the app
  supplies all navigation itself (§6). The iOS left-edge history back-swipe still exists in
  standalone and cannot be disabled — in-app navigation uses real history entries so the system
  gesture stays sane (plain `<Link>` navigation already guarantees this).
- **V4.** iOS's keyboard shrinks only the *visual* viewport; `position: fixed`/`sticky` bottom
  elements are simply covered while it is open, and Safari still does not implement the
  `interactive-widget` viewport meta (WebKit #259770). Consequences:
  - Form action bars are `sticky` **in normal flow at the end of the form** — reachable by the
    same scroll gesture the operator is already making, never trapped under the keyboard.
  - Single-line inputs submit on Enter, and `enterkeyhint` labels that key, so the keyboard
    itself is always a valid way to finish (§8).
  - Tracking `visualViewport` to float bars above the keyboard is real work with real jank;
    deferred (§11) rather than half-done.
- **V5.** `-webkit-tap-highlight-color: transparent` globally, because every control provides its
  own pressed state (the button primitives translate on `:active`). `touch-action: manipulation`
  on interactive controls kills the double-tap-to-zoom click delay.
- **V6.** Root overscroll keeps the platform default: pull-to-refresh is genuinely useful on
  `force-dynamic` pages in the installed app (Android). Inner scrollers that must not chain
  (bottom sheets, horizontal pagers) get `overscroll-behavior: contain`.

## 6 · Navigation model (N)

- **N1.** **Bottom toolbar** (phone only): 4 fixed destinations + "More", each slot ≥ 48px tall
  (T2), always labelled, labels never wrap or truncate to nothing (M3 navigation bar: 3–5
  destinations, always-visible labels). The toolbar never hides on scroll — this app has no
  screen long enough to justify chrome that runs away.
- **N2.** "More" opens a **bottom sheet** with the full grouped map — bottom, because that is
  where the opening thumb already is (M3 modal sheet; Hoober reach).
- **N3.** **App bar** (phone): up-affordance + title + at most one page-level action, in that
  order. HIG toolbars: back is a **symbol, not a text label**; one primary action, trailing side.
  The bar is sticky and padded for the status bar — in standalone it is the only title and the
  only way out.
- **N4.** The up-affordance goes **up, not home**: from `/admin/sales/[id]` up is `/admin/sales`;
  from a section root up is the dashboard. Derived from the nav map, not hand-passed per page.
- **N5.** Identity (who is signed in) and **Sign out** live in the More sheet (phone) and the
  sidebar footer (desktop) — not in the app bar. Sign-out is a rare, deliberate act; it does not
  get premium chrome on every screen while page actions have nowhere to live.
- **N6.** The page `<h1>` comes from the nav map (existing behaviour, kept). Title stays short —
  HIG suggests ≲ 15 characters before truncation looks like an accident.
- **N7.** The desktop sidebar is kept as-is (the mandate: keep desktop affordances that cost the
  phone nothing).

## 7 · Sheets, dialogs & menus (S)

- **S1.** Confirmations and small forms present as a **bottom sheet on phones** (< `sm`) and a
  centred dialog at `sm`+. One primitive, responsive placement — M3 calls the modal bottom sheet
  the mobile alternative to dialogs; HIG sheets sit at the bottom with detents.
- **S2.** Sheet/dialog buttons on phones are stacked full-width, ≥ 44px, safe action nearest the
  thumb, destructive separated above it (T5). At `sm`+ they return to a right-aligned row.
- **S3.** Sheets are dismissed by scrim tap, the close button, or Esc (M3: scrim tap must always
  dismiss). Swipe-to-dismiss requires gesture code this repo deliberately doesn't ship — the
  affordances above are each a single tap, which passes the same test.
- **S4.** Bottom sheets pad `env(safe-area-inset-bottom)` and round only their top corners; content
  above the home indicator, always.
- **S5.** Typed-confirmation deletes (type DELETE) stay exactly as they are: 2.5.8's "essential"
  reasoning applies — friction is the feature. The sheet placement (S1) still applies.
- **S6.** The **status menu stays an anchored menu**, not a sheet: it is the highest-frequency
  control in the app, it opens adjacent to the thumb that pressed it, every item is ≥ 44px, there
  are only five options, and Radix flips it when space runs out. Converting it to a modal sheet
  would add a full-screen context switch to the app's most repeated action. (M3 permits menus for
  exactly this; the "menus want to be sheets" rule is for *overflow* menus, which the admin
  doesn't have.)
- **S7.** Only one modal surface at a time (HIG Modality). Nothing in the admin stacks sheets.

## 8 · Forms & data entry (E)

- **E1.** Every field ≥ 16px text (F1), ≥ 44px tall (T1), labelled with a **persistent visible
  label** — placeholders are examples, never labels (HIG text fields: placeholder text disappears
  when typing starts).
- **E2.** Correct virtual keyboard per field, via semantic `type` first, `inputmode` second:

  | Field | Attributes |
  |---|---|
  | Login email | `type="email"` `autocomplete="username"` `enterkeyhint="next"` |
  | Login password | `type="password"` `autocomplete="current-password"` `enterkeyhint="go"` |
  | New password | `autocomplete="new-password"` |
  | Guest email | `type="email"` `autocomplete="off"` (operator enters *someone else's* data — autofilling the operator's own details would be wrong, per WCAG 3.3.7's spirit and HIG entering-data) |
  | Phone | `type="tel"` |
  | Party size / order | `type="number"` `inputmode="numeric"` |
  | Search / free date text | plain text (the "preferred date" field is deliberately prose — "late summer, flexible" — so no date keyboard) |

- **E3.** `enterkeyhint` on every single-line field; the final field of a short form says
  `go`/`done` and Enter submits (V4).
- **E4.** The primary submit action of a long form lives in a **sticky action bar** at the end of
  the form: sticky so it never scrolls out of reach mid-form, in-flow so the keyboard cannot trap
  it (V4). It clears the bottom toolbar via bottom-offset + safe area.
- **E5.** Bilingual (PT/EN) fields keep the *both-always-visible* rule — the two boxes stack on
  phones (PT above EN) with a language chip on each; no tabs, because a tab makes the other
  language forgettable and these fields' contract is that both exist. (This preserves the intent
  recorded in `experience-form.tsx`.)
- **E6.** Field errors render inline, adjacent to the field, `role="alert"`, and never only as
  colour (WCAG 1.4.1 by side-effect).
- **E7.** Login is the front door of the installed app: no zoom on focus (F1), password-manager
  tokens (E2), submit button visible with the keyboard open at 390 × 844 (short form, in-flow
  button), and it looks intentional — brand mark, heading, one card, centred in `min-h-dvh`.
- **E8.** Never prepopulate a password field (HIG entering data). Temporary-password fields use
  `autocomplete="off"`.

## 9 · Lists, tables & the board (L)

- **L1.** **No data `<table>` below the width where it fits whole.** Under that width the same
  records render as stacked rows: identifying field first (name), secondary facts demoted to a
  compact `dl`/meta line, actions as full-size touch targets. WCAG 1.4.10's table exception is
  for tables that *must* be 2-D; a users list does not.
- **L2.** Where the table does return (`lg`/`xl`+, per-table by measured min-width), it keeps its
  own `relative overflow-x-auto` container as a belt-and-braces boundary.
- **L3.** List rows are ≥ 56px tall (M3 one-line list item), with 16px side padding.
- **L4.** The **Sales board on phones is a stage pager, not a stack**: one stage visible at a
  time, swipeable horizontally (CSS `scroll-snap-type: x mandatory`, full-width slides — fixed
  slide size, which is the safe case for `mandatory`), with an always-visible **stage chip rail**
  showing every stage and its true count. Reaching any stage costs **one tap** (chip) or a swipe;
  triaging the last stage no longer means scrolling past every card in every earlier one.
  Desktop keeps the existing multi-column snap rail.
- **L5.** Stage chips are ≥ 44px targets (T1) and the rail is a `tablist` semantically; the pager
  syncs the active chip on scroll.
- **L6.** Moving a card between stages remains the **status picker on the card** — one control
  that works everywhere, honouring the recorded decision to remove drag-and-drop (and 2.5.7).
- **L7.** Cards keep triage facts only (who, what, how old, worth); everything else lives on the
  detail page. Value and age stay visible without any interaction.

## 10 · States (X)

- **X1.** Loading skeletons mirror the real layout — same shell chrome (header height, bottom
  toolbar, safe-area padding), so nothing shifts under a thumb already in motion. Phone skeleton
  shows the toolbar; desktop shows the sidebar.
- **X2.** Empty states say what the screen is for and what will appear (existing
  `PlaceholderPanel` pattern, kept) — designed at 390px: icon, one-line title, ≤ 2-line body.
- **X3.** Error / not-found / forbidden are single centred cards at phone width with one primary
  recovery action ≥ 44px. No raw error content (existing rule, kept).
- **X4.** Interaction feedback within **200ms** (INP "good"): status changes paint optimistically
  (existing `useOptimistic` pattern, kept); every control has a visible pressed state (V5).

## 11 · PWA fit & finish (P)

- **P1.** Manifest keeps `display: standalone`, `orientation: portrait`, `id`/`start_url`/`scope`
  at `/admin`, maskable + any icons. Verified end-to-end in the audit.
- **P2.** Add `shortcuts` for the two screens operators actually jump to (Sales, Catalogue).
  Android-only (long-press icon; iOS ignores them) — useful, but nothing load-bearing.
- **P3.** `display_override` is **not** added: it is experimental, Chromium-only, and the app has
  no use for `window-controls-overlay`/`tabbed`; `standalone` is already the right mode and iOS
  ignores the override list anyway.
- **P4.** `theme_color` stays the single light value, matching `--background`, in both manifest
  and viewport export — correct while there is deliberately no dark theme (C4). iOS ≥ 15 colours
  the status bar from it; `apple-mobile-web-app-status-bar-style` stays `default`.
- **P5.** **No service worker in this pass.** Offline behaviour for a data-entry tool means
  request queuing and conflict policy, which deserve their own change and their own testing.
  Follow-up work: precache the shell, network-first data, and an offline screen that says what is
  and isn't safe to retry.
- **P6.** Also deferred: `visualViewport`-tracked floating bars (V4), dark mode (C4), and haptics
  (no web API worth using).

## 12 · Primitives decision

The mandate's option **(a)** was chosen: the **touch-comfortable size is the default** in the
shared `src/components/ui/*` primitives, and every public-site usage was audited and verified
(screenshots in the PR). Rationale:

- The public site's users are *also* on phones — guests booking a tour from Instagram. The public
  tour-request form had the same 14px-input iOS zoom bug the admin had; one fix serves both.
- An admin-scoped sizing layer would be a second styling system (context-dependent defaults or
  unlayered CSS overriding utilities) — exactly the parallel approach the constraints forbid.
- Compact sizes (`sm`, `xs`, `icon-sm`…) **remain available and opt-in** for genuinely dense,
  pointer-first contexts; nothing was deleted.

Resulting scale (all CSS px):

| Primitive | default | lg | sm | xs |
|---|---|---|---|---|
| Button height | **44** (`h-11`) | 48 (`h-12`) | 36 (`h-9`) | 32 (`h-8`) |
| Icon button | **44** (`size-11`) | 48 | 36 | 32 |
| Input/Select height | **48** (`h-12`), 16px text | — | 36, 16px text | 32, 16px text |
| Textarea | min 48, 16px text | — | — | — |
| Menu item | ≥ 44 | — | — | — |
| Toolbar tab | ≥ 48 (T2) | — | — | — |

Every compact size keeps ≥ 16px input text (F1 is unconditional). Admin code uses the defaults —
**no more hand-patched `h-11`s** — and any use of a compact size in admin code needs a reason a
reviewer can read.

Public usages audited: `site-header` (book button `sm`), `mobile-nav` (hamburger `icon`, book
button default), `tour-request-form` (default fields), `booking-flow` (party stepper `icon`),
`booking-button` (`lg` CTAs), `casamentos`/`eventos`/`blog` pages (`lg` CTAs), public
`error`/`not-found` (default buttons), `faq`/`accordion` (own styles, untouched).

## Sources

- Apple HIG: Accessibility (44pt default / 28pt min, 12–24pt spacing), Layout, Designing for iOS,
  Toolbars (back = symbol; one trailing primary action), Sheets (detents, grabber), Modality,
  Entering data, Text fields — developer.apple.com/design/human-interface-guidelines/…
- Material Design 3: structure & touch targets (48dp/8dp), navigation bar (3–5 labelled
  destinations), top app bar, bottom sheets (modal ≤ 50% initial height, drag handle 32×4dp),
  FAB, snackbar vs dialog, window size classes, lists (56/72/88dp), cards — m3.material.io;
  numeric tokens cross-checked against the AndroidX Compose Material3 token source.
- WCAG 2.2: 2.5.8, 2.5.5, 2.5.7, 2.4.11, 3.3.7, 1.4.10 (320px / 256px), 1.4.11, 1.4.4, 1.4.3 —
  w3.org/WAI/WCAG22/Understanding/…
- Steven Hoober: “How Do Users Really Hold Mobile Devices?” (uxmatters, 2013 — 49% one-handed,
  grips change constantly), “Design for Fingers, Touch, and People, Part 3” (uxmatters, 2017 —
  7mm centre → 12mm edge accuracy); Smashing Magazine, “Accessible Tap Target Sizes” (2023).
- Platform: 16px iOS input-zoom threshold (css-tricks, defensivecss.dev); viewport units
  (web.dev/blog/viewport-units — `dvh` ignores the keyboard); `env(safe-area-inset-*)` +
  `viewport-fit` (MDN); visualViewport & iOS keyboard behaviour (bramus/viewport-resize-behavior;
  WebKit bug 259770 — `interactive-widget` unimplemented in Safari); `inputmode`, `enterkeyhint`,
  `autocomplete` tokens, `touch-action`, `overscroll-behavior`, scroll snap (MDN); installed-PWA
  UX, `shortcuts`, `display_override`, INP ≤ 200ms @ p75 (web.dev; firt.dev/notes/pwa-ios).
