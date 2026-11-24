# Handoff jam-503

## Next action

The operator tests the preview and ticks Ready to merge. Then the operator says `release JAM-503`.

## How to test

On the preview, set `STRIPE_CONNECTED_ACCOUNT_ID` to a sandbox account that cannot take charges, and open `/reservar`: the enquiry form shows, and Sentry gets one alert. Set it to an account that can take charges: the checkout runs as before. With the variable unset, nothing changes.

Pages: `/reservar` (PT and EN), the pay button of a quote (`/orcamento/<token>`), and the pay button of a payment link (`/reservar/pagar/<token>`).

## Blockers

- none

## Do not touch

- none

## Notes

- The answer of Stripe is held for 5 minutes for each server instance. A failed read is held for 1 minute and shows the enquiry form.
- A value of `STRIPE_CONNECTED_ACCOUNT_ID` that is not an account id now shows the enquiry form on `/reservar`. Before, the page showed the checkout and the checkout failed.
- The webhook, the confirmation page and refunds do not ask the account. They act on payments that exist.
