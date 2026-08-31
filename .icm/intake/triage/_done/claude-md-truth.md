# Stub: Layer 0 tells two lies — "fully static" and "booking shipped"

- lane: chore
- found-by: tech lens + code map · 2026-08-29
- priority: P2

## Problem

`CLAUDE.md` says "The site is fully static (SSG)" — it is ISR over a runtime DB with
a build-time fallback, and `web/src/lib/security-headers.ts:14-15` repeats the claim
as a load-bearing justification. `README.md`'s status section says "Instant booking
with Stripe payments shipped (Jul 2026)" — the checkout has never rendered in
production (the pricing-mapping defect). The next session that trusts Layer 0
inherits both errors.

## Proposed change

Correct CLAUDE.md's rendering claim (ISR + fallback, and what that implies), align
the security-headers comment, and rewrite README's status section to the register's
truth (`.icm/project.md` Features table is the source). Fold in the domain note once
env-driven-domain lands.

## Prompt

In the agorasim repo, fix the Layer 0 claims per
`.icm/intake/triage/claude-md-truth.md`: `CLAUDE.md` (rendering model; check the
domain/status lines against `.icm/project.md`), the comment in
`web/src/lib/security-headers.ts`, and `README.md`'s "Status / follow-ups" section —
state what actually ships per the register's Features table, not aspirations.
Docs-only: ticket-only commit conventions apply.
