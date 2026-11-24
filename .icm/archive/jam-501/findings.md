# Findings jam-501

## F1 — follow-up: the go-live acts for the two webhook secrets

- kind: Finding or follow-up (Jamie asked for it in the chat, 2026-11-24: "Write all of the remaining steps into a ticket that handles the go live deployment")
- title: agorasim · Paid bookings go live: the Stripe endpoints, the Production values and the live test
- text: the Stripe live endpoints (platform and Connect), the Production values (`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET` and the other live Stripe values), the new staged build, the promotion, and the €1 live test. Go-live plan B22, B25, B26.
- filed: JAM-571 (Triage), related to JAM-501, JAM-511, JAM-503
