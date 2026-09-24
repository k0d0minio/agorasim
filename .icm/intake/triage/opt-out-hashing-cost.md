# Stub: The opt-out path re-imports its HMAC key and rescans consenting enquiries on every press

- lane: chore
- found-by: thankyou-review-email (Release code review, high) · 2026-09-24
- complexity: low

## Problem

`web/src/lib/email-opt-out-token.ts` `hmacBytes` imports the CryptoKey on every call, and the
thank-you job hashes each address twice (`isOptedOut`, then `optOutToken`) before signing.
`web/src/lib/email-opt-out.ts` `recordOptOut` loads every enquiry with marketing consent and
hashes each one on every POST — repeats included — so the cost of an opt-out grows with the
consenting list (small today: explicit opt-in only).

## Proposed change

Cache the imported key per process; compute the address hash once per booking and build the
token from it; skip the consent rescan when the suppression row already existed **and** no
enquiry with consent matches (or store a consent-side hash so the match is one query). Keep
the "a retry finishes the job" property the module note describes.

## Prompt

In the agorasim repo, read `.icm/intake/triage/opt-out-hashing-cost.md`. Cache the HMAC key in
`web/src/lib/email-opt-out-token.ts`, hash each address once per booking in
`web/src/lib/cron/thank-you-review.ts`, and make `recordOptOut` in
`web/src/lib/email-opt-out.ts` avoid the full consenting-enquiry scan on a repeat press, with
tests. `git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
