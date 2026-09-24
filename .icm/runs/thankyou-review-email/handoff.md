# Handoff: thankyou-review-email

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. The operator reads `02_define/output/spec.md` (or the Spec block on PR #141); a change goes
   through `revise thankyou-review-email "<what>"`.
2. Once **Spec approved** is ticked on PR #141: `/pipeline build thankyou-review-email`,
   executing `plan.md` pass by pass (complexity complex → opus).

## Blockers

- blocked on operator: tick **Spec approved** in the body of
  https://github.com/k0d0minio/agorasim/pull/141
- Before the preview smoke: `EMAIL_OPT_OUT_SECRET` must exist in Vercel (Preview, uat,
  Production) — without it the thank-you job fails closed and sends nothing.

## Do not

- Do not start Build before the Spec approved tick; never tick it.
- Do not rotate or derive `EMAIL_OPT_OUT_SECRET` from `BOOKING_TOKEN_SECRET`.
- Do not touch the Notifications page — `lifecycle-messages/notifications-page-real` owns it.
- Do not subscribe PR #141 to PR activity (`_shared/github.md`).
