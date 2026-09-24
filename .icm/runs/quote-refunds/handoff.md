# Handoff: quote-refunds

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator smokes the preview (https://agorasim-git-claude-magical-tesla-jhv1jt-kodominio.vercel.app,
   admin → a wedding/event lead with a sandbox-paid deposit): Reembolsar partial, then full with
   "Cancelar também o evento"; a refund from the Stripe test dashboard; the "event still held"
   warning and Cancelar evento. The preview's build migrates its own Neon branch (0029).
2. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/142.
3. Then `/pipeline release quote-refunds` — read `03_build/output/notes.md` → Notes for Release
   first (audit entity on the lead, the accepted echo race, open sessions not expired on cancel).

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on PR #142.

## Do not

- Do not tick either gate box.
- Do not widen `message_log_quote_receipt_key`; the refund notice has its own key (D-3).
- Do not change tour refund behaviour or the existing `route.test.ts` refund cases.
- `db-branch.sh quote-refunds down` after the merge, not before (the run's Neon branch carries 0029).
