# Handoff: quote-refund-echo-race

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator smokes the preview https://agorasim-git-claude-friendly-lamport-wvw8qq-kodominio.vercel.app :
   the Notifications page (`/admin`, "Mensagens automáticas") lists "Evento cancelado"; on a test
   quote whose deposit was refunded, "Cancelar evento" sends the couple the new email; a refund
   from the quote card is audited under the admin. Check the preview's build log applied
   `0034_quote_event_cancelled_kind`.
2. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/166, then
   `release quote-refund-echo-race`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/166
- `security-check.sh --branch` reports BLOCKED on pre-existing `next`/undici advisories in
  `main`'s lockfile — parked as `.icm/intake/triage/deps-next-undici-advisories.md`; Release
  stop class 2 will see it until that chore merges.

## Do not

- Do not tick either gate.
- Do not bump dependencies in this PR — that is the parked chore.
- Do not touch the stale-total read, the post-refund write guard or the idempotency key — the
  epic's other stubs.
