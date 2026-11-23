### Q1. Keep a short hold while the guest is on the payment form, so two guests cannot pay for the last seat?
- type: single
- options: yes, 15 minutes, not shown as a booked seat in the admin | yes, 30 minutes, not shown as a booked seat in the admin | no hold
- default: yes, 15 minutes, not shown as a booked seat in the admin
- answer: yes, 15 minutes, not shown as a booked seat in the admin
- note: the breakdown default (question 1 for Jamie in `.icm/intake/seats-and-holds/breakdown.md`), set by the start brief of 2026-11-23. Jamie can change it at the Spec approved gate. Stripe accepts no Checkout session shorter than 30 minutes: see choice 1 in `spec.md`.
