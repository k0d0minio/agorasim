# Scope: embedded-checkout

- story: 01_scope/\_source/story.md — the source as received, never edited
- author/source: Jamie Nisbet (operator), in chat, with a UAT screenshot
- personas: guest
- agreed: 2026-10-01
- complexity: medium
- recommended-model: sonnet
- stubs: 2 (.icm/intake/embedded-checkout/)
- canonical: this file, until Define writes spec.md

---

## The story

<!-- Source: Jamie Nisbet (operator), 2026-10-01, via chat (Claude Code session), with one screenshot.
     Recorded as received. Never edited — what was settled on top of it lives in scope.md. -->

### 2026-10-01 — message 1

ok so in testing in uat there is an error with stripe. However I've noticed something, that clicking on that pay and book button, it redirects the user to checkout.stripe. I want the user to remain on the agorasim website and to have the embed or something more inline. We want the customer to feel like they have never left the app

### 2026-10-01 — message 2 (screenshot)

A screenshot of the hosted Stripe Checkout page on UAT: Card selected, test card 4242 4242 4242 4242, expiry 08/31, CVC 256, cardholder "Jamie Nisbet", country Portugal; other methods listed are Klarna, iDEAL | Wero, Bancontact and EPS; the Link "Save my information for faster checkout" box is unticked. Below the form, Stripe's red banner: "There was an error processing your request."

---

## Assumptions

- Today both ways to pay send the guest to Stripe's own page: "Pay and book" on `/reservar`, and the pay button on a quote page (`/orcamento/<token>`). Both come back to us afterwards.
- Everything behind the payment stays as it is: the 30-minute hold on the car, the Connect commission taken on each payment, the webhook that confirms a booking or an instalment, the confirmation page and the emails. Only where the guest types their card changes.
- Which payment methods show (card, MB WAY, Multibanco, Klarna…) is still set in the Stripe dashboard, not in code.
- The guest can still pay on a phone. The payment step must work at phone width.
- Stripe's colours and logo on the payment form are set in the Stripe dashboard (Branding). Making it look like ours is partly a dashboard job, not only code.
- The UAT error in the screenshot is not caused by leaving the site. Stripe made the session and then refused the payment itself. Embedding the form will not fix it. It is a separate bug (see Out of scope).

## Decisions

| ID  | Decision | Why / context | Changes |
| --- | -------- | ------------- | ------- |
| D-1 | Use Stripe's embedded Checkout: Stripe's own payment form, shown inside our page. | Smallest change that keeps the guest on agorasim. The hold, commission, webhook and confirmation keep working as they do. A fully custom card form would rewrite the payment flow. | "the embed or something more inline" → the embed |
| D-2 | Both payments move: tour bookings on `/reservar` and quote instalments (deposit and balance) on the quote page. | The guest should never leave the site, whichever way they pay. | "pay and book button" → also the quote pay button |
| D-3 | On `/reservar`, the booking form is replaced in place by the payment step, on the same page. The summary of what they are buying stays in view, with a way back to change their details. | It reads as the next step of the same form, not a pop-up on top of it. | no change |
| D-4 | The UAT payment error is handled on its own, as a bug, not in this scope. | It is about the Stripe account set-up, not where the form is shown. Mixing the two would hide which change fixed what. | "there is an error with stripe" → out of this scope |

## Out of scope

- The UAT payment error ("There was an error processing your request."). That is a separate bug lane run, fixed first or alongside (D-4).
- A fully custom card form styled field by field as our own (Stripe's Payment Element). Not this round (D-1).
- Changing which payment methods are offered. That stays a Stripe dashboard switch.
- Admin-side payments, refunds, the Sales board and the emails. Nothing there changes.
- Stripe dashboard branding (colours, logo, icon). It is a dashboard setting for Jamie or the client, not a code change.

## Open for Define

- Where the guest lands after paying. Today Stripe sends them to `/reservar/confirmacao` and back to the quote page. With the form on our page, Define decides whether they still go to those pages or see the result in place. Lands in both stubs.
- How "change my details" works on `/reservar`. Today, leaving Stripe brings back the form from the draft the browser kept. Define decides how going back from the payment step restores the form and what happens to the car already held for them. Lands in `reservar-embedded-checkout`.
- The site's security policy blocks every outside frame and script today, and turns off the browser's payment features. Define sets the narrowest policy that lets Stripe's form, and Apple Pay / Google Pay inside it, work. Lands in `reservar-embedded-checkout`.
- Where on the quote page the payment step appears: in place of the pay button, or replacing the quote's payment section. Lands in `quote-embedded-checkout`.
