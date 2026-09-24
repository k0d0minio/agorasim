# Tweak: quote-page-throttle-wording

- change: web/src/content/quote-page.ts + app/[locale]/orcamento/[token]/page.tsx — a throttled
  quote lookup now shows its own "too many attempts, try again in a few minutes" panel (PT/EN,
  `Clock` icon) instead of the "link no longer valid" panel; web/src/content/booking.ts +
  components/cancel-booking-panel.tsx + app/[locale]/reserva/cancelar/[token]/page.tsx — the
  cancel link's throttled lookup gets the matching treatment instead of the "link no longer
  active" panel. Neither panel says anything about whether the token was real.
- changelog: announce: none (the repo keeps no changelog — `_shared/project-rules.md` →
  Reporting)
- learned: none — see `error.log` for the RED this run hands off with; it's an org-wide Neon
  branch quota, not a repo code rule.
