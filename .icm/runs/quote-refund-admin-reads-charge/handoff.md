# Handoff: quote-refund-admin-reads-charge

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once **Ready to merge** is ticked on https://github.com/k0d0minio/agorasim/pull/164, run
   `/pipeline release quote-refund-admin-reads-charge`.

## Blockers

- blocked on operator: smoke the preview
  (https://agorasim-git-claude-happy-johnson-fz1ikr-kodominio.vercel.app) and tick
  **Ready to merge** in the body of https://github.com/k0d0minio/agorasim/pull/164
- `security-check.sh --branch` reports `BLOCKED 1` on `dependency-audit` — pre-existing on main
  (next 16.3.4, undici), not this branch's; parked as
  `intake/triage/dependency-advisories-next-undici.md`. Release should read it as such, not as
  a finding of this diff.

## Do not

- Do not touch the idempotency key, the dialog ceiling, the echo-race ordering or the
  post-refund write guard — stubs 2–4 of `quote-refund-hardening` own them.
- Do not bump dependencies in this run (the chore stub owns it).
- Do not tick either gate box.
