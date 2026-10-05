# Bug: fix-status-messages-and-focus

- observed: quote-form success and cancel-page outcomes swap in with no live region and unmount the focused button, so focus falls to <body>; the cancel "start" button unmounts into the confirm block without moving focus · expected: outcomes are announced and focus lands on the outcome heading / the safe "Manter" action
- cause: conditional renders replace the focused element; nothing announces or refocuses (WCAG 4.1.3, 2.4.3)
- fix: web/src/components/quote-request-form.tsx: role="status" on the success card, focus its title; web/src/components/cancel-booking-panel.tsx: focus "Manter" when the confirm block opens, Panel gets `announce` (role="status" + heading focus) for done / state-driven unknown / too-late (first-render panels unchanged, no focus stealing)
- changelog: not user-visible (no changelog in this repo)
- learned: none
