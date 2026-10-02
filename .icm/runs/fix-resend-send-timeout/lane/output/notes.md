# Bug: fix-resend-send-timeout

- observed: a hung Resend request is awaited indefinitely, including inside the Stripe webhook after the booking left `pending`, so the confirmation is never sent and Stripe's retry finds nothing to do · expected: the send gives up and returns the failed result
- cause: `fetch` in `sendEmail` had no abort signal; the webhook route set no `maxDuration`
- fix: `web/src/lib/email.ts`: `AbortSignal.timeout(8_000)` on the fetch, timeout reported through `captureError` with `reason: timeout`; `web/src/app/api/stripe/webhook/route.ts`: `maxDuration = 30`; `email.test.ts`: signal present, timed-out send resolves `{ sent: false, reason: "failed" }`
- changelog: announce: none
- learned: none
