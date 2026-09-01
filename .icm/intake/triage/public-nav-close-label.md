# Stub: The public mobile nav's close button says "Close" in Portuguese too

- lane: tweak
- found-by: `admin-portugues/hig-polish-pass` HIG audit · 2026-08-31
- priority: P3
- size: XS
- sources: `web/src/components/ui/sheet.tsx` (`closeLabel` default);
  `web/src/components/mobile-nav.tsx:38`; `web/src/components/site-header.tsx`
  (`openLabel`, already localized)

## Problem

`SheetContent` draws a close button whose only accessible name is a visually
hidden string. The admin now passes `closeLabel="Fechar"`; the public site's
`MobileNav` does not, so it takes the English default — and a Portuguese visitor
on `agorasim.pt` hears "Close" announced for the button that shuts the menu.

This is not new; the admin translation only made it visible, because the shared
primitive suddenly had two callers wanting two different words. The public side
was left alone deliberately: `admin-portugues` does not touch guest-facing
strings, which are bilingual via `Localized<T>`, and hardcoding Portuguese in the
primitive would have broken the English site instead.

`MobileNav` already takes an `openLabel` prop that `site-header.tsx` fills from
localized content, so the shape of the fix is established — it is one more prop
and one more content string, not a design question.

## Proposed change

Add a `closeLabel` to `MobileNav`'s props alongside `openLabel`, source it from
the same content module in `web/src/content/` (a `Localized<string>` — *Fechar* /
*Close*), and pass it through to `SheetContent`. Check whether any other public
`Sheet` usage appears in the meantime.

## Prompt

In the agorasim repo (`web/`), give the public mobile nav a localized close
label per `.icm/intake/triage/public-nav-close-label.md`: add the string to the
content module that already supplies `openLabel`, thread it through
`web/src/components/mobile-nav.tsx` into `SheetContent`'s `closeLabel` prop, and
keep PT and EN in sync. PR on a `claude/` branch; no local checks — CI is the
source of truth.
