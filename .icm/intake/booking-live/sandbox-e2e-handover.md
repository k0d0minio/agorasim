# Stub: Sandbox end-to-end pass, then the link goes to Diogo & Rita

- feature-slug: sandbox-e2e-handover
- epic: booking-live
- priority: P1
- size: S
- depends-on: checkout-ux-fixes
- sequence: 7 of 8
- sources: deal objective 2026-08-27 (DEAL.md, icm-board `workspaces/deals/diogo-rita/`); prices.pdf; info PDF §1.4–1.5

## Problem

The rescoped objective is a first working version for the client's testing at
agorasim.jamienisbet.com: sandbox payments, booking end-to-end. Once the preceding
stubs land, nothing verifies the whole against the source documents before the link
goes out.

## Proposed change

A verification pass on the deployed preview: every price scenario from prices.pdf
priced correctly at checkout (public/private, children, infants, each add-on with its
minimum and the Manzwine Monday closure); availability honours the driver/vehicle
pools; a sandbox card completes payment; the confirmation page and both emails render
with the right meeting point; the enquiry fallback still works with Stripe env unset.
Fix what fails, then draft the WhatsApp handover message for Jamie to send with the
test link and a sandbox card number. **Sending is Jamie's** — the session only drafts.

## Acceptance criteria (rough)

- [ ] Priced checkout matches prices.pdf for a written matrix of scenarios
- [ ] Sandbox payment → confirmed booking → both emails, verified on the deployment
- [ ] Handover message drafted; Jamie sent it (his tick)

## Prompt

In the agorasim repo, run the sandbox handover check described in
`.icm/intake/booking-live/sandbox-e2e-handover.md`: on the deployed
agorasim.jamienisbet.com preview, verify checkout pricing against
`.icm/docs/prices.pdf` scenario by scenario, complete a sandbox Stripe payment, and
confirm the emails and admin Sales board reflect it. Fix small failures directly (PR
on a `claude/` branch, CI is the source of truth — no local checks); anything
structural becomes a new stub. Finish by drafting the PT WhatsApp message with the
test link for Jamie to send — never send anything yourself.
