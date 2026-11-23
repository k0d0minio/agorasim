# Stripe Connect proof — the commission on a connected account

- status: **partial** — the code is read and the fees are computed. The test-mode run on a
  connected account is **not done**.
- ticket: JAM-472 (spike S2), 2026-11-23
- source: the Commission & Payments Agreement (A) §3–§6 and §8, the proposal of
  2026-07-23 (P) §4–§5, `.icm/docs/launch-runbook.md` Track C

## Verdict

**Go for the code. No proof in Stripe yet.**

The code takes the fee that the agreement states, on a direct charge, for each payment
and each refund. No code fix blocks the launch. The four payments and the refund were
not run in Stripe, because this spike created no connected account. Section
"Not yet proven" has the steps that close the proof.

## What the code does today

| Act | Where | What Stripe gets |
|---|---|---|
| Tour checkout | `web/src/lib/booking-checkout.ts` | A Checkout Session on the connected account (`stripeAccount`), with `payment_intent_data.application_fee_amount` = `commissionOn("tour", total)` |
| Payment link of a tour | `web/src/lib/payment-link.ts` | The same session and the same fee rule |
| Quote instalment (deposit, balance) | `web/src/lib/quote-checkout.ts` | One session for each payment. The fee is `commissionOn(kind, payment amount)`: 6 % of that payment for an event |
| Embedded form in the browser | `web/src/components/embedded-checkout.tsx` | `loadStripe(publishableKey, { stripeAccount })`. The platform's publishable key, with the connected account id |
| Refund from the admin | `web/src/lib/booking-refund.ts` | A refund on the connected account with `refund_application_fee: true` |
| Refund from Diogo's dashboard | `web/src/lib/booking-refund.ts`, `web/src/lib/quote-refund.ts` | The webhook `charge.refunded` tops up the fee refund on the platform (`applicationFees.createRefund`) to the proportion of the amount refunded |
| Fee audit | `readCommissionAudit` in `booking-checkout.ts`, and the same read in `quote-checkout.ts` | Reads `charge.application_fee_amount` back and logs a difference from the expected fee |
| Webhook | `web/src/app/api/stripe/webhook/route.ts` | Acts on `event.account` = `STRIPE_CONNECTED_ACCOUNT_ID` or no account. Another account is ignored and alerted |
| The switch | `web/src/lib/stripe.ts` | `STRIPE_CONNECTED_ACCOUNT_ID` unset = platform charge, no fee. Set = direct charge with the fee |

The unit tests mock Stripe. They prove the parameters, not what Stripe does with them.

## The known unknowns of the ticket

| Unknown | Answer | Proven in Stripe |
|---|---|---|
| `stripe.ts` uses `stripeAccount` and never ran on a connected account | `stripeAccount` is the documented header for a direct charge. Every call on a session, intent, charge or refund carries it. The fee refund on the platform does not, which is correct | No |
| Does Embedded Checkout need the account in the browser too | Yes. Stripe.js must load with `stripeAccount` for a session made on a connected account. The code does this with the platform's publishable key | No |
| Is the webhook ready for events of connected accounts | Yes, for one Connect endpoint. Limit: `STRIPE_WEBHOOK_SECRET` holds one secret. After the switch, events of the platform account itself are not verified. Today no live charge is on the platform, so the risk is low | No |
| Connect Standard onboarding for a Portuguese trabalhador independente | Stripe supports Portugal and the business type "individual" with a personal NIF. No block is known. The payout IBAN must be in the name of the person who onboards | No — needs Diogo |
| Who pays the Stripe fee on a direct charge | The connected account (Agorasim), as A §3 says. On a Standard account Stripe bills the processing fee to the account. The platform pays no Stripe fee on the charge | No |
| Does the client's dashboard show the fee line (A §8) | Expected yes: on a Standard account the payment's detail shows the Stripe fee and the application fee of the platform as two lines. Jamie's dashboard shows the fee under Connect → Collected fees | No — needs the test run |

## Expected fees

`commissionOn` rounds to the nearest cent. These values come from the code and the
agreement. The column "Stripe shows" stays empty until the test run.

| # | Payment | Basis | Rule | Expected fee | Stripe shows |
|---|---|---|---|---|---|
| 1 | Tour, couple with one add-on | €150.00 | 4 % = €6.00, floor | **€10.00** | — |
| 2 | Tour, small group, 2 guests | €470.00 | 4 % | **€18.80** (P: "≈ €19") | — |
| 3 | Tour, private day with add-ons, 6 guests | €1,400.00 | 4 % = €56.00, cap | **€50.00** | — |
| 4a | Event quote €800: deposit 30 % | €240.00 | 6 % | **€14.40** | — |
| 4b | Event quote €800: balance | €560.00 | 6 % | **€33.60** | — |
| — | Total of 4a + 4b | €800.00 | 6 % of the whole (A §5) | **€48.00** | — |
| 5 | Full refund of payment 2 | €470.00 | A §6, in proportion | **€18.80 returned** | — |

The rounding is per payment. A deposit and a balance with half cents can sum to one cent
away from 6 % of the total. No price on the list has this today.

## Not yet proven

These need a test-mode connected account. Jamie does them in the Stripe sandbox of the
platform account, then fills the column "Stripe shows":

1. In the sandbox: Connect → Accounts → create a test Standard account. Complete the
   onboarding with Stripe's test values.
2. On one preview of `web`: set `STRIPE_CONNECTED_ACCOUNT_ID` to the test `acct_…`, with
   the sandbox `sk_test_` and `pk_test_` keys. Add a sandbox Connect webhook endpoint for
   the preview URL with "Listen to events on Connected accounts", and put its secret in
   `STRIPE_WEBHOOK_SECRET` for that preview only.
3. Pay rows 1, 2 and 3 on `/reservar` with the card `4242 4242 4242 4242`. Pay row 4a,
   then 4b, on one event quote.
4. Refund row 2 in full from the admin. Refund one more tour from the test account's own
   dashboard, to prove the fee top-up of the webhook.
5. For each row, read the fee in the test account's payment detail (A §8) and under
   Connect → Collected fees on the platform. Write both in the table.

Also not known:

- The country of the platform account and whether its fees settle in EUR. A
  cross-border fee inside the EEA is expected to work. Read it in the sandbox.
- With a direct charge, the payment methods (MB WAY, Multibanco) come from the
  connected account's settings, not the platform's. This is in Diogo's dashboard.

## Steps for Diogo (one batch, from Jamie)

1. Do you sell the tours as yourself (trabalhador independente, the personal NIF) or
   as a company? Default: as yourself, business type "individual".
2. Is the payout IBAN in your own name? Stripe requires the account holder's name.
3. Which CAE is on your atividade aberta? Stripe asks for the business activity.
4. Open the onboarding link from Jamie on your phone. Have your Cartão de Cidadão ready.
   Use the website `https://agorasim.pt`.
5. In your Stripe dashboard: turn on MB WAY and Multibanco, set payouts to weekly, turn
   off the Stripe receipt email, and turn on 2FA.
6. After the first live booking: send Jamie a screenshot of its payment detail, so both
   sides see the application fee line (A §8).
