# Bug: fix-placeholder-contrast

- observed: placeholders render at Tailwind v4 preflight's default (`currentcolor` 50% alpha),
  blending to ~3.1:1 against the background · expected: ≥4.5:1 (WCAG 1.4.3, admin spec C1)
- cause: `fieldBase` (`web/src/components/ui/input.tsx`) carried no `placeholder:` utility, so
  every field built on it — `Input`, `Select`, `Textarea` — inherited the preflight default.
- fix: `web/src/components/ui/input.tsx`: added `placeholder:text-muted-foreground` to
  `fieldBase`, pinning the ratio to ~5.3:1.
- changelog: not user-visible (a contrast fix to existing fields, no new copy or behaviour)
- learned: none
