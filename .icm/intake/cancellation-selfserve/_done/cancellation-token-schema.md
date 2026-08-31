# Stub: Cancellation token + state — the schema half

- feature-slug: cancellation-token-schema
- epic: cancellation-selfserve
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 4
- sources: 2026-08-29 data lens: `bookings` (web/src/db/schema.ts:583-669) has `cancelledAt` and no token/nonce; bookings deliberately hold no guest identity, so the token is the auth

## Problem

A guest has no way to authenticate against their booking: the table holds no guest
identity (by GDPR design) and no token. Self-serve cancellation needs an unguessable,
revocable credential per booking plus columns recording who/when/what-path cancelled.

## Proposed change

Migration adding a high-entropy cancellation token (hashed at rest — treat it like a
password; the emailed link carries the plaintext once), `cancelledVia`
(guest|admin), and whatever `refund-machinery` didn't already add. Token minted at
booking creation; never logged; excluded from subject-data export payloads (it's a
credential, not personal data).

## Acceptance criteria (rough)

- [ ] New bookings carry a hashed token; plaintext exists only in the email link
- [ ] Cancellation state records via/when
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add the cancellation-token schema per
`.icm/intake/cancellation-selfserve/cancellation-token-schema.md`: a drizzle
migration on `bookings` (hashed token column + `cancelled_via`), token minted in the
booking-creation path (`web/src/lib/booking-checkout.ts` / `web/src/lib/bookings.ts`),
hashing per the repo's existing credential patterns (`web/src/lib/password.ts` uses
scrypt; an HMAC of a random token is fine here — follow
`web/src/lib/admin-session.ts` conventions). No route yet — next stub. PR on a
`claude/` branch; no local checks — CI is the source of truth.
