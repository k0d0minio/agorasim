# Brand — the palette, the type and the illustrations

- status: **decided 2026-11-23** — the presence level and the main colours are the defaults of
  JAM-480 (Q1 and Q2 of pull request #266). Jamie can change them at the gate.
- source: three illustrations and a palette card by the client's graphic designer, sent by
  Diogo on 2026-11-18. BAXTER work item w-20261122-005.
- applied by: JAM-481 (palette), JAM-482 (hill edges), JAM-483 (scenes), JAM-484 (404,
  confirmation, emails), JAM-485 (fleet drawings). On 2026-11-24 the site uses the palette
  (JAM-481) and the hill edges (JAM-482). The scenes, the spots and the fleet drawings are not
  on the site yet.

This page is the one home of the brand rules. A brand ticket links to this page. It does not
copy the rules.

The first rule: **the photos sell.** The real photos of the tours stay the main selling
element. The illustrations and the palette give the brand. They complement the photos. They
never compete with them.

## Palette

The designer's card is the source. The sampled pixels of the scenes match it. The three main
colours have a green mark on the card.

| Name | Hex | oklch | Role |
|---|---|---|---|
| Deep teal | `#164B50` | `oklch(0.381 0.055 204.1)` | **main.** Links, buttons, focus ring, footer |
| Warm sand | `#E6D9B2` | `oklch(0.886 0.053 91.8)` | **main.** Secondary and muted surfaces |
| Terracotta | `#773C39` | `oklch(0.430 0.083 24.1)` | **main.** Headings on a band, the reviews band |
| Burnt orange | `#D78C43` | `oklch(0.703 0.127 62.3)` | accent. Chips, small rules, icons. Never text on a light background |
| Dusty lavender | `#A895DE` | `oklch(0.714 0.106 295.5)` | accent. The Events band only. Never text on a light background |
| Off-white | `#F3E9D5` | `oklch(0.937 0.029 84.6)` | page background, text on a dark band |

Derived steps. They are not on the card. The interface needs them.

| Name | Hex | oklch | Use |
|---|---|---|---|
| Paper | `#FAF6EE` | `oklch(0.974 0.011 84.6)` | cards, popovers |
| Ink | `#2A211C` | `oklch(0.257 0.017 50.7)` | body text |
| Ink muted | `#5E5249` | `oklch(0.448 0.021 59.1)` | secondary text |
| Field border | `#8A7B6A` | `oklch(0.592 0.031 70.7)` | the border of a form field (3.40:1 on Off-white, over the 3:1 floor) |
| Line | `#D9CBB0` | `oklch(0.846 0.040 83.8)` | decorative borders and dividers only |
| Orange tint | `#E9C8A2` | `oklch(0.852 0.063 70.8)` | 35 % Burnt orange on Off-white. Hover and notice fills |
| Orange text | `#9A4F1B` | `oklch(0.511 0.118 51.2)` | orange text on a light background |
| Night | `#1B0A14` | `oklch(0.175 0.034 345.0)` | the Events band behind the night scene |
| Tan | `#DFB484` | `oklch(0.797 0.081 69.3)` | the second hill of the day scene. Hill edges only (`--brand-tan`) |
| Email teal dark | `#0D373B` | `oklch(0.31 0.045 204.1)` | the banner of the team notification email (`emailPalette.primaryDark`) |
| Email teal tint | `#DBECED` | `oklch(0.93 0.018 204.1)` | the fill of a callout panel in an email (`emailPalette.primaryTint`) |

## Token map

The tokens are in `:root` of [`web/src/app/globals.css`](../../web/src/app/globals.css). Every
brand colour of the site comes from them. The shadcn names stay the main API: a component uses
`primary`, `secondary` or `muted`, not a brand name.

| Token | Value on 2026-11-23 | Brand value |
|---|---|---|
| `--background` | `oklch(0.985 0.008 85)` | Off-white |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `oklch(0.26 0.02 60)` | Ink |
| `--card`, `--popover` | `oklch(0.995 0.005 85)` | Paper |
| `--primary`, `--ring`, `--chart-1` | `oklch(0.47 0.075 148)` (green) | Deep teal |
| `--primary-foreground` | `oklch(0.98 0.012 90)` | Off-white |
| `--secondary` | `oklch(0.93 0.028 78)` | Warm sand |
| `--muted` | `oklch(0.955 0.014 82)` | Warm sand |
| `--secondary-foreground` | `oklch(0.32 0.03 60)` | Ink |
| `--muted-foreground` | `oklch(0.52 0.022 66)` | Ink muted |
| `--accent` | `oklch(0.9 0.045 68)` | Orange tint (not solid Burnt orange: `--accent` is the mobile-menu hover and the notice fill) |
| `--accent-foreground` | `oklch(0.32 0.045 55)` | Ink |
| `--border` | `oklch(0.9 0.018 78)` | Line |
| `--input` | `oklch(0.62 0.025 70)` | Field border |
| `--chart-2` to `--chart-5` | browns and greens | Burnt orange, Terracotta, Dusty lavender, Ink muted |
| `--destructive` | `oklch(0.53 0.19 27)` | `oklch(0.49 0.19 27)`: darker, so its text passes on the light fills. A destructive notice or button never sits on Warm sand |

The brand tokens. They go in `:root`, with a `--color-brand-*` alias in `@theme inline`, so
Tailwind makes `bg-brand-terracotta` and the others. Only the brand components and the story
bands use them.

```css
--brand-teal: oklch(0.381 0.055 204.1);
--brand-sand: oklch(0.886 0.053 91.8);
--brand-tan: oklch(0.797 0.081 69.3);
--brand-terracotta: oklch(0.430 0.083 24.1);
--brand-orange: oklch(0.703 0.127 62.3);
--brand-lavender: oklch(0.714 0.106 295.5);
--brand-night: oklch(0.175 0.034 345.0);
--brand-orange-text: oklch(0.511 0.118 51.2);
```

The palette has more copies outside `globals.css`. They change with it:

- `emailPalette` in [`web/src/lib/email-layout.ts`](../../web/src/lib/email-layout.ts): the
  same colours in hex.
- `viewport.themeColor` in [`web/src/app/[locale]/layout.tsx`](../../web/src/app/[locale]/layout.tsx)
  and [`web/src/app/admin/layout.tsx`](../../web/src/app/admin/layout.tsx): the hex of
  `--background`.
- `background_color` and `theme_color` in
  [`web/public/admin-manifest.webmanifest`](../../web/public/admin-manifest.webmanifest): the same.
- The placeholder gradient in [`web/src/components/media.tsx`](../../web/src/components/media.tsx):
  palette steps, so a missing photo looks on-brand.

The admin console shares `globals.css`. It takes the same colours. It gets no illustrations.

## Contrast

WCAG 2.x ratios. Body text needs 4.5:1. A field border needs 3:1.

| Pair | Ratio | Rule |
|---|---|---|
| Ink on Off-white / on Warm sand / on Paper | 13.08 / 11.20 / 14.62 | pass |
| Deep teal on Off-white, Off-white on Deep teal | 8.08 | pass: links, buttons |
| Warm sand on Deep teal | 6.92 | pass: the name in the footer |
| Terracotta on Off-white, Off-white on Terracotta | 7.00 | pass: headings, story bands |
| Ink muted on Off-white / on Warm sand | 6.27 / 5.37 | pass |
| Orange text on Off-white | 4.97 | pass |
| Ink on Orange tint | 9.94 | pass: hover and notices |
| Ink on Burnt orange / on Dusty lavender | 5.79 / 6.02 | pass: the text on a chip is Ink |
| Dusty lavender on Night | 7.29 | pass: the Events eyebrow |
| Field border on Off-white | 3.40 | pass: a field border, not text |
| Destructive on `bg-destructive/10`, on Off-white / on Paper | 4.86 / 5.40 | pass: a destructive notice or button |
| Destructive on `bg-destructive/13` (the button hover), on Off-white | 4.61 | pass |
| Destructive on `bg-destructive/10`, on Warm sand | 4.19 | **fail: never on Warm sand** |
| Off-white on Email teal dark | 10.71 | pass: the team email banner |
| Ink / Deep teal on Email teal tint | 12.93 / 7.99 | pass: the email callout |
| Burnt orange on Off-white | 2.26 | **fail: never text** |
| Dusty lavender on Off-white | 2.17 | **fail: never text** |
| White on Burnt orange | 2.72 | **fail: never a white-text button** |

## Typography

- Headings: Fraunces. Body: Geist. Both load through `next/font` in
  [`web/src/app/[locale]/layout.tsx`](../../web/src/app/[locale]/layout.tsx) and
  [`web/src/app/admin/layout.tsx`](../../web/src/app/admin/layout.tsx).
- The brand does not change the type. Both fonts fit the illustrations.

## Illustrations

The presence level is **B, framed**: the palette, hill edges between sections, and one
illustrated scene on a few story pages. The photos lead on every page.

There are three kinds of drawing:

- **Scene**: one full illustration (sunset with the 2CV, night with the VW T3 and the dog, day
  hills).
- **Hill edge**: an inline SVG band of 2 to 4 hill layers, traced from the day scene. It joins
  two sections. It is decorative (`aria-hidden`).
- **Spot**: a small drawing, 240 px wide at most, for an empty state, the 404 or a thank-you.

### Where they go

| Place | What |
|---|---|
| Home hero | a hill edge at the bottom, in `--background`, 70 px high at most. No scene, no vehicle |
| Home intro | the sunset scene next to the text, in 2 columns from `md` |
| Home sections | hill edges into and out of the Experiences section |
| Home reviews | a Terracotta band with Off-white text. The guest photos stay |
| Sobre | the first photo stays. The sunset scene goes in the body section |
| Eventos | the night scene on a Night band, with a lavender eyebrow |
| Casamentos | hill edges only. The wedding photos lead |
| Footer | a 4-layer hill band at the top: sand, tan, terracotta and teal, the layers of the day scene. The footer is Deep teal, with the name in Warm sand |
| 404 | the van and dog spot |
| Booking confirmation | a small spot above the thank-you. The booking details stay above the fold on a 375 px phone |
| Booking emails | a hill band above the logo (PNG, because Outlook has no WebP) |
| Fleet strip on Home | a drawing of each car, when the designer sends them |

### Where they never go

- Not on or behind a photo.
- Not in an experience card.
- Not on an experience page (`/experiencias/…`).
- Not in the booking or payment steps. The confirmation page is the one exception.
- Not in an Open Graph image.
- Not in the admin console.
- One scene per page at most. Hill edges and spots do not count.

### How to use them

- Crop a scene. Do not stretch it and do not recolour it.
- A scene is never above the fold on a selling page. It loads with no `priority`.
- A scene has alt text in pt and en. A decorative use has `alt=""`.
- A committed scene file is under 300 KB. Every committed image is under 5 MB
  ([`web/AGENTS.md`](../../web/AGENTS.md)).
- The night and day scenes are 1091 px wide. Keep them in half-width columns until the
  designer sends larger files.
- Burnt orange and Dusty lavender are never text on a light background.

### The raw files

The designer's raw files are client material. Decision D47 says that client material lives in
the deal archive, not in this repository. Only derived, optimised files enter the repository.

## What to ask the designer for

1. Vector or layered source files: SVG, or Procreate or PSD with each hill, the sky, each
   vehicle and the dog on its own layer.
2. A landscape version of each scene (about 3:1).
3. The VW T3, the 2CV and the dog alone, on a transparent background.
4. The Renault 4 and the Fiat 600 in the same style.

Items 1 and 2 make the hill edges and the scenes better. They do not block them. Items 3 and 4
block the fleet drawings (JAM-485).
