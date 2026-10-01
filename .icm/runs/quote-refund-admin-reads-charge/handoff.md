# Handoff: quote-refund-admin-reads-charge

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once **Spec approved** is ticked on https://github.com/k0d0minio/agorasim/pull/164, run
   `/pipeline build quote-refund-admin-reads-charge` and execute `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** in the body of https://github.com/k0d0minio/agorasim/pull/164

## Do not

- Do not touch the idempotency key, the dialog ceiling, the echo-race ordering or the
  post-refund write guard — stubs 2–4 of `quote-refund-hardening` own them.
- Do not change `booking-refund.ts` or the webhook route (the snapshot finding is parked in
  `intake/triage/refund-webhook-stale-charge-snapshot.md`).
- Do not tick either gate box.
