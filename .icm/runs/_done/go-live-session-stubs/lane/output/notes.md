# Bug: go-live-session-stubs

The three session-side stubs of the go-live epic, finished in one lane PR because this
cloud session is bound to one harness-named branch (`new-run.sh` accepts it and records
it): `stripe-env-guard` (6 of 9), `launch-copy-truth` (7 of 9) and
`stripe-unset-fallback-test` (8 of 9). All three are prerequisites the runbook names for
the env flip in `go-live-on-landing`; none needed a decision beyond what its stub records.

- observed: nothing held the Stripe key's mode against `VERCEL_ENV` — a `sk_test_` key left in
  Production after DNS lands takes bookings nobody pays for, a live key pasted into Preview lets
  every branch URL charge real cards; `/privacidade` and `/privacy` rendered `TODO(legal)` notes
  and a `.icm/` path to guests; `/reservar` said online payment "is still being built" whenever
  no day was open; the launch fallback (no `STRIPE_SECRET_KEY`) had no test on any of its three
  surfaces · expected: a mismatched key refuses to sell and alerts; the policy pages print only
  the policy (the draft banner stays); the enquiry fallback says what `paymentsOff` says; the
  fallback branch is pinned by tests.
- cause: the money rule of the switch lived only in the runbook (§6) and in people's heads; the
  privacy notes were written into `sections[].body` instead of a never-rendered array as
  `terms.ts` already did; the "being built" note predates checkout shipping; the sandbox always
  had a key, so the path the plan falls back to was the one path never exercised.
- fix: `web/src/lib/stripe.ts`: `keyModeMismatch()` — Production requires `sk_live_`, Preview
  forbids it, unset `VERCEL_ENV` and an unset key are never a mismatch; `isStripeConfigured()`
  answers false on a mismatch (so `/reservar`, the checkout action, refunds and the webhook take
  their existing payments-off paths) and `stripe()` throws before any session; reported once per
  instance through `captureAlert` (new area `stripe` in `observability.ts`, level fatal) and the
  deployment log, key never in the message. `web/src/content/privacy.ts`: the six rendered notes
  moved into `legalOpenItems` (eight items — the two retention sentences split into their true
  half and their note), header and `privacy-policy.tsx` comment repointed. `tour-request.ts`:
  `note` retired; `reservar/page.tsx` renders `bookingContent.errors.paymentsOff` under the
  enquiry lead. `business-facts.md`: the domain line now states D18. Stale cutover claims in
  `site-origin.ts`, `email-layout.ts`, `legacy-redirects.ts` and `next.config.ts` corrected.
  Tests: `stripe.test.ts` (both refusal directions, both accepted pairings, local unset, no key);
  `reservar/page.test.ts` (no key → enquiry metadata + `TourRequestForm` + payments-off line;
  matching key → checkout; mismatched key → enquiry); `reservar/checkout-actions.test.ts` (the
  action refuses with `paymentsOff` before any defence runs, both for no key and a mismatch).
  Stubs `git mv`ed to `.icm/intake/go-live/_done/`.
- changelog: announce: none — no changelog in this repo; user-visible only on `/privacidade`,
  `/privacy` and the `/reservar` fallback line
- learned: none
