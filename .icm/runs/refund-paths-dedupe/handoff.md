# Handoff: refund-paths-dedupe

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator smokes the preview: https://agorasim-git-claude-amazing-cori-0e2qjo-kodominio.vercel.app
   — `/admin/sales/<a lead with a paid quote>`: open "Reembolsar" on an instalment; the default
   amount and "máximo agora" read the instalment's paid-less-refunded total; a sandbox partial
   refund goes through and the card refreshes.
2. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/188.
3. Then `/pipeline release refund-paths-dedupe`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on PR #188.
- Release's `security-check.sh --audit` will report the `braces` high advisory that `main`
  carries (dev-only, no upstream fix) — not this run's; parked as
  `intake/triage/braces-advisory-eslint-chain.md`. Release needs the operator's waiver or that
  chore merged first.

## Do not

- Do not edit `booking-refund.test.ts`, `quote-refund.test.ts` or `quotes.test.ts` — their
  passing unchanged is the acceptance criterion.
- Do not tick Ready to merge — it is the operator's.
