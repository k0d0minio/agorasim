# Chore: fill-helper-consolidation

- invariant: behaviour unchanged; the `{key}` filler exists once (`web/src/lib/fill-template.ts`) instead of four times.
- change: `web/src/lib/fill-template.ts`: new exported `fillTemplate` (unknown keys left visible). `booking-emails.ts`, `cancel-booking-panel.tsx` and `orcamento/[token]/page.tsx` drop their private `fill` and import it; `content/pricing.ts` `fill(template, locale, values)` keeps its signature and wraps `fillTemplate` (values stringified).
- rollback: revert the PR; no data or schema involved.
- learned: none
