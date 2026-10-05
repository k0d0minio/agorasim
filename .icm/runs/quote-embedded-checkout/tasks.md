# Tasks: quote-embedded-checkout

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] Tapping pay for a deposit or a balance never navigates to a stripe.com address; Stripe's payment form appears in the quote page where the pay button was, under a line naming the instalment and amount.
- [ ] "Back" on the payment step shows the pay button again without a server call; tapping pay again within the hour mounts the same Stripe session (no second session is created).
- [ ] A successful test card payment ends on `/{locale}/orcamento/<token>?session_id=…`, the instalment shows as paid on the quote page and in admin, and the receipts go out once, as today.
- [ ] The session carries the Connect application fee (6% of the instalment) exactly as today when `STRIPE_CONNECTED_ACCOUNT_ID` is set, and none when it is unset; its `expires_at` is still 60 minutes from the tap.
- [ ] An open embedded session under today's terms is reused; one under older terms, or an open hosted session minted before this ships, is expired before its replacement is minted; a lost race expires its own session and returns the winner's client secret.
- [ ] The `return_url` is the quote page plus `?session_id={CHECKOUT_SESSION_ID}`, and the session has no `success_url` or `cancel_url`; the token appears in no other new URL, log line or metadata.
- [ ] With the publishable key missing or mode-mismatched, a pay tap shows the existing "unavailable" sentence, reports once, and does not redirect.
- [ ] If the embedded form fails to load, the couple sees a localized message with "back" and is never redirected to stripe.com.
- [ ] `/pt/orcamento/<token>` and `/en/orcamento/<token>` serve `PAYMENT_CSP` and `PAYMENT_PERMISSIONS_POLICY`; every other public route and every `/admin` route serves exactly the headers it serves today.
- [ ] The payment step reads correctly in PT and EN and fits at 375px wide.
- [ ] The privacy policy (PT and EN) and the Stripe row in `.icm/docs/data-protection.md` describe the embedded form on both the booking and the quote page, and no longer mention a redirect to checkout.stripe.com.
- [ ] Unit tests cover: an embedded session is minted with `return_url` and no `success_url`/`cancel_url`; reuse returns the open session's client secret; an open hosted session is expired and replaced; the race path returns the winner's client secret; `payQuote` returns the payment payload instead of redirecting and refuses when the publishable key is not configured; the quote route is in the payment-route sources.

## Queue

- [ ] <task — small enough for one commit; name the file or area>
