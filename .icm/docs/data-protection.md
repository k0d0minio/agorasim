# Data protection — the register of open decisions

- status: **draft** — nothing here has been reviewed by counsel
- cited by: `web/src/content/privacy.ts` (header comment and the retention section, both locales) and `web/src/lib/retention.ts` (header comment)
- history: the original file was deleted at `21d39ea` and is not reachable from this clone's history; recreated 2026-09-10 for the launch-cutover epic (`.icm/intake/launch-cutover/_done/privacy-refresh.md`)

This is the one place the privacy policy's open questions live. The policy on
`/privacidade` carries a **draft banner** (`privacyContent.draftNotice`) until every item
under *Open items* is answered and a human with Portuguese/EU data-protection knowledge has
signed the text off. Nothing in this file is legal advice.

## Processors the site uses (as of 2026-09-10)

| Processor | Role | Personal data it sees | Region / transfer | Where in code |
|---|---|---|---|---|
| Vercel | Hosting, experience photos | Request logs (IP), pages served | TODO(legal): confirm region | `web/` deploy |
| Neon | Postgres — enquiries, bookings, audit log, message log | Everything the forms collect; booking amounts and Stripe references; audit IPs | TODO(legal): confirm region | `web/src/db/` |
| Stripe | Payment processing via **Checkout (redirect)** — card data never touches the app | Guest email, line items (experience, date, party), amount, booking id in metadata | Stripe Payments Europe (Ireland) expected for a PT account — TODO(legal): confirm the contracting entity | `web/src/lib/booking-checkout.ts`, `web/src/lib/stripe.ts` |
| Resend | Transactional email — booking confirmation/cancellation, enquiry reply, team copy | Recipient address, name, booking details in the body | **EU-west (Ireland)** region; US parent → standard contractual clauses as the transfer safeguard | `web/src/lib/email.ts`, `web/src/lib/message-log.ts` |

Money model, as the policy states it: the charge is a **direct charge on the client's own
Stripe account** (`STRIPE_CONNECTED_ACCOUNT_ID`), so Agorasim is merchant of record; the
platform takes an `application_fee_amount` (4%, `web/src/lib/commission.ts`) that Stripe
routes automatically. The platform never receives card data. Until the client's account
exists the session is a plain platform charge on Jamie's sandbox keys — the policy wording
describes the live state, not the sandbox one.

## Open items

1. **Retention window for unconverted enquiries — proposed, unsigned.**
   `DEFAULT_RETENTION_DAYS = 730` (24 months from last contact) in
   `web/src/lib/retention.ts` is a proposal, chosen as common practice for warm sales leads
   in EU tourism. Nobody at Agorasim has signed it off. The policy says so in both locales
   ("PROPOSTA, A CONFIRMAR" / "PROPOSED, NOT YET DECIDED"). Decision needed from Diogo &
   Rita; then set `ENQUIRY_RETENTION_DAYS` and change the policy text in the same PR.
   Related recommendations (not decisions): audit-log IPs 90 days
   (`AUDIT_IP_RETENTION_DAYS`), Resend message ids 90 days
   (`MESSAGE_PROVIDER_ID_RETENTION_DAYS`).
2. **Retention for bookings that actually happened.** Excluded from anonymisation pending a
   decision on tax record-keeping periods (the policy carries a `TODO(legal)` for this).
   Needs an accountant's answer on how long invoicing records must be kept.
3. **RNAAT registration number — unanswered.** Blank in the client's info PDF (§1.1). The
   policy's controller block (`controller` in `privacy.ts`) cannot be completed without it,
   and the terms-of-sale page needs it too. Blocks the draft banner.
4. **Liability insurance (provider + policy number) — unanswered.** Same source, same
   blocker. Chase alongside the RNAAT number.
5. **Lawful basis wording.** The policy states Art. 6(1)(b) for enquiries (pre-contractual
   steps) and for paid bookings (contract performance), Art. 6(1)(a) for marketing email.
   Counsel to confirm, and to say whether tax obligations attached to paid bookings need
   describing as a separate purpose.
6. **Hosting regions and transfer mechanisms.** Confirm Vercel and Neon regions, the Stripe
   contracting entity, and that Resend's EU region plus SCCs is the right description for
   its US parent. The policy's recipients section carries a `TODO(legal)` for exactly this.
7. **Counsel sign-off → banner off.** When items 1–6 are resolved, remove
   `privacyContent.draftNotice` and every `TODO(legal)` in `privacy.ts`, in one PR, and
   record the reviewer and date here.

## Rules of thumb kept here so they are not re-argued

- `MARKETING_CONSENT_VERSION` moves **only** when `privacyContent.marketing.label` changes.
  Policy edits that leave the opt-in wording alone (like the 2026-09-10 Stripe/Resend
  refresh) do not bump it.
- Adding or removing a processor changes `privacy.ts` (both locales) and this table in the
  same PR.
- Anonymise, don't delete: expired enquiries lose name/email/phone/message and keep the
  statistical shell (`retention.ts`).
