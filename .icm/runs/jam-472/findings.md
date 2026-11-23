# Findings jam-472

## F1. A plaintext credential in a deal document

The info request `agorasim-info.pdf` (Jamie's archive of deal documents, outside the repo)
holds a registrar login and its password in plaintext, in the client's answer to §1.3.
It also holds the payout IBAN. Move the password to the password manager and change it.
Nothing of it is in the repo.

## F2. Draft comment for JAM-472

The operator files it. This pipeline does not write to Linear.

> Spike S2 result: `.icm/docs/stripe-connect-proof.md` (PR #267).
> Verdict: go for the code, no proof in Stripe yet. The code takes the agreement's fee on
> a direct charge for each tour, each deposit and balance, and returns it on a refund
> (also on a refund from the client's dashboard). Expected: €150 → €10, €470 → €18.80,
> €1,400 → €50, €800 event → €14.40 + €33.60 = €48, full refund of €470 → €18.80 back.
> Not run: no test connected account was made. The page has the five steps for Jamie in
> the sandbox, and six steps for Diogo in one batch. One limit: the webhook holds one
> signing secret (draft ticket D2).

## F3. Draft follow-up tickets

The operator files them.

- **D1. Run the Connect proof in the sandbox** (lane knowledge). Make a test Standard
  account, set it on one preview, pay the five rows of `stripe-connect-proof.md`, and
  fill the column "Stripe shows". Done = each row has the fee that Stripe shows in both
  dashboards.
- **D2. The webhook accepts the platform secret and the Connect secret** (lane tweak).
  `STRIPE_WEBHOOK_SECRET` holds one secret. After the switch to Connect, an event of the
  platform account (a refund of a booking taken before Connect) fails the signature.
  Done = the route verifies with either secret, and a test covers both.
- **D3. Refuse the switch when the connected account cannot take charges** (lane tweak).
  The runbook says "never set `STRIPE_CONNECTED_ACCOUNT_ID` before their account is
  verified". Nothing enforces it. Done = the checkout reads the account's
  `charges_enabled` once per instance, offers the enquiry form when it is false, and
  alerts Sentry.
