# AGORA-001 · Stop the bleeding: mount the tour-request form and start the external clocks

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P0 |
| Size | S |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 0 |

## Problem

The site currently captures zero leads: `web/src/components/tour-request-form.tsx` and its
server action (`web/src/app/[locale]/reservar/actions.ts`) are complete and tested but
mounted nowhere — `/reservar` renders the `BookingFlow` visual preview with a disabled pay
button. Meanwhile the two longest external lead times (client facts, Stripe onboarding)
haven't started.

## Acceptance

- [x] `TourRequestForm` mounted on `/reservar` (replacing the `BookingFlow` preview) and
      reachable from `/contactos`.
- [ ] A submission lands on the admin Sales board end-to-end, verified on a phone.
- [ ] `.icm/docs/information-request-diogo-rita.md` sent to Diogo & Rita; the 15-min DNS
      call booked (human step — confirm with Jamie).
- [ ] Stripe onboarding started the moment their details arrive (human step).
- [x] CI green.

**Closed with the code item shipped (PR #20).** The unticked boxes are Jamie's to run —
they need a phone, an inbox and a Stripe account, not a branch. They stay tracked as
Phase 0 of [`../../docs/launch-plan.md`](../../docs/launch-plan.md), and AGORA-002 still
names the information request as its blocker, so nothing is lost by closing this.

## Prompt

Mount the existing TourRequestForm on /reservar in the agorasim repo, replacing the
BookingFlow preview, and link it from /contactos. Read
.icm/intake/AGORA-001-mount-lead-capture.md and .icm/docs/launch-plan.md (Phase 0 + the
codebase audit) for full context. Open a PR on a claude/ branch; do not run local checks —
CI is the source of truth.
